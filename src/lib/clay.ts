import { getConfig } from './config'

export interface ClayCompanyData {
  domain: string
  name: string
  linkedinUrl?: string
  employeeCount?: number
  engineerCount?: number
  industry?: string
  fundingRound?: string
  fundingDate?: string
  technologies?: string[]
}

export interface ClayContactData {
  email: string
  name: string
  title?: string
  seniority?: string
  roleFunction?: string
  linkedinUrl?: string
  emailConfidence?: number
}

export interface ClayEnrichmentResult {
  company?: ClayCompanyData
  contacts?: ClayContactData[]
  success: boolean
  error?: string
  rawResponse?: any
}

export class ClayAdapter {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  static async create(): Promise<ClayAdapter> {
    const config = await getConfig()
    return new ClayAdapter(config.clay.apiKey)
  }

  async enrichCompany(domain: string): Promise<ClayEnrichmentResult> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'Clay API key not configured'
      }
    }

    try {
      // Clay API endpoint for company enrichment
      const response = await fetch('https://api.clay.com/v1/enrichment/company', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          domain,
          include_contacts: true,
          contact_filters: {
            seniority: ['director', 'vp', 'c-level', 'manager'],
            department: ['engineering', 'product', 'technology']
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Clay API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      return {
        success: true,
        company: this.mapCompanyData(data.company),
        contacts: data.contacts?.map((c: any) => this.mapContactData(c)) || [],
        rawResponse: data
      }
    } catch (error) {
      console.error('Clay enrichment error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        rawResponse: null
      }
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.apiKey) {
      return { success: false, error: 'API key not configured' }
    }

    try {
      // Test with a known domain
      const result = await this.enrichCompany('factory.ai')
      return { success: result.success, error: result.error }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed'
      }
    }
  }

  private mapCompanyData(clayData: any): ClayCompanyData {
    return {
      domain: clayData.domain,
      name: clayData.name || clayData.company_name,
      linkedinUrl: clayData.linkedin_url,
      employeeCount: clayData.employee_count || clayData.headcount,
      engineerCount: clayData.engineering_headcount || clayData.tech_team_size,
      industry: clayData.industry || clayData.vertical,
      fundingRound: clayData.latest_funding_round,
      fundingDate: clayData.latest_funding_date,
      technologies: clayData.technologies || clayData.tech_stack
    }
  }

  private mapContactData(clayData: any): ClayContactData {
    return {
      email: clayData.email,
      name: clayData.full_name || `${clayData.first_name} ${clayData.last_name}`.trim(),
      title: clayData.title || clayData.job_title,
      seniority: this.mapSeniority(clayData.seniority),
      roleFunction: this.mapRoleFunction(clayData.department),
      linkedinUrl: clayData.linkedin_url,
      emailConfidence: clayData.email_confidence || clayData.confidence_score
    }
  }

  private mapSeniority(clayValue: string): string {
    if (!clayValue) return 'unknown'
    
    const value = clayValue.toLowerCase()
    if (value.includes('ceo') || value.includes('cto') || value.includes('cpo')) return 'c-level'
    if (value.includes('vp') || value.includes('vice president')) return 'vp'
    if (value.includes('director')) return 'director'
    if (value.includes('manager') || value.includes('lead')) return 'manager'
    if (value.includes('senior')) return 'senior'
    if (value.includes('junior')) return 'junior'
    return 'mid'
  }

  private mapRoleFunction(clayValue: string): string {
    if (!clayValue) return 'unknown'
    
    const value = clayValue.toLowerCase()
    if (value.includes('engineering') || value.includes('developer') || value.includes('tech')) return 'engineering'
    if (value.includes('product')) return 'product'
    if (value.includes('design')) return 'design'
    if (value.includes('marketing')) return 'marketing'
    if (value.includes('sales')) return 'sales'
    return 'other'
  }
}

export default ClayAdapter