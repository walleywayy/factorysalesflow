import { db } from './db'

export interface AppConfig {
  clay: {
    apiKey: string
  }
  smtp: {
    host: string
    port: number
    user: string
    pass: string
    fromName: string
    fromEmail: string
  }
  scoring: {
    engineerThreshold: number
    icpToggles: {
      industries: string[]
      geos: string[]
      minStage: string
    }
  }
  slack: {
    enabled: boolean
    webhookUrl?: string
  }
  emailTemplates: {
    [key: string]: {
      subject: string
      body: string
    }
  }
}

const defaultConfig: AppConfig = {
  clay: {
    apiKey: process.env.CLAY_API_KEY || ''
  },
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    fromName: process.env.SMTP_FROM_NAME || 'Willem Alleyne',
    fromEmail: process.env.SMTP_FROM_EMAIL || 'willem.alleyne@princeton.edu'
  },
  scoring: {
    engineerThreshold: parseInt(process.env.ENGINEER_THRESHOLD || '20'),
    icpToggles: {
      industries: ['SaaS', 'AI/ML', 'DevTools'],
      geos: ['US', 'EU'],
      minStage: 'Seed'
    }
  },
  slack: {
    enabled: process.env.SLACK_ENABLED === 'true',
    webhookUrl: process.env.SLACK_WEBHOOK_URL
  },
  emailTemplates: {
    A: {
      subject: 'Ship faster with agents at {{company}}',
      body: `Hi {{first_name}},

I noticed {{company}} has {{eng_size}} engineers working on {{relevant_stack}}. 

As a {{role}} at a {{recent_event}} company, you're likely dealing with operational overhead that's slowing down your team's velocity.

At Factory, we help engineering teams like yours automate repetitive tasks with AI agents, so you can focus on building features your customers actually want.

{{value_one_liner}}

Worth a quick 15-minute chat this week?

Best,
Willem`
    },
    B: {
      subject: 'Cut ops toil for {{role}} at {{company}}',
      body: `Hi {{first_name}},

Saw that {{company}} recently {{recent_event}} - congrats! With {{eng_size}} engineers on your team, I imagine you're feeling the operational complexity that comes with growth.

Most {{role}}s we work with tell us their teams spend 30-40% of their time on operational tasks instead of core product development.

We've helped similar companies reduce that operational overhead by 60% using AI agents for common workflows.

{{value_one_liner}}

{{cta}}

Best,
Willem`
    }
  }
}

let configCache: AppConfig | null = null

export async function getConfig(): Promise<AppConfig> {
  if (configCache) return configCache

  try {
    // Load settings from database
    const settings = await db.setting.findMany()
    const dbConfig: Partial<AppConfig> = {}

    for (const setting of settings) {
      const keys = setting.key.split('.')
      let current = dbConfig as any
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {}
        current = current[keys[i]]
      }
      
      current[keys[keys.length - 1]] = setting.valueJson
    }

    // Merge with defaults
    configCache = mergeConfig(defaultConfig, dbConfig as AppConfig)
    return configCache
  } catch (error) {
    console.warn('Failed to load config from database, using defaults:', error)
    configCache = defaultConfig
    return defaultConfig
  }
}

export async function updateConfig(updates: Partial<AppConfig>): Promise<void> {
  const flatUpdates = flattenConfig(updates)
  
  for (const [key, value] of Object.entries(flatUpdates)) {
    await db.setting.upsert({
      where: { key },
      update: { valueJson: value },
      create: { key, valueJson: value }
    })
  }
  
  // Invalidate cache
  configCache = null
}

function mergeConfig(base: AppConfig, updates: Partial<AppConfig>): AppConfig {
  return {
    clay: { ...base.clay, ...updates.clay },
    smtp: { ...base.smtp, ...updates.smtp },
    scoring: {
      ...base.scoring,
      ...updates.scoring,
      icpToggles: { ...base.scoring.icpToggles, ...updates.scoring?.icpToggles }
    },
    slack: { ...base.slack, ...updates.slack },
    emailTemplates: { ...base.emailTemplates, ...updates.emailTemplates }
  }
}

function flattenConfig(config: Partial<AppConfig>): Record<string, any> {
  const result: Record<string, any> = {}
  
  function flatten(obj: any, prefix = '') {
    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        flatten(value, newKey)
      } else {
        result[newKey] = value
      }
    }
  }
  
  flatten(config)
  return result
}