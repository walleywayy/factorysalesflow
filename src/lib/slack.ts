import { getConfig } from './config'

export interface SlackNotification {
  text: string
  blocks?: any[]
  channel?: string
}

export class SlackNotifier {
  private webhookUrl: string
  private enabled: boolean

  constructor(webhookUrl: string, enabled: boolean) {
    this.webhookUrl = webhookUrl
    this.enabled = enabled
  }

  static async create(): Promise<SlackNotifier> {
    const config = await getConfig()
    return new SlackNotifier(
      config.slack.webhookUrl || '',
      config.slack.enabled
    )
  }

  async postLeadCard(lead: any): Promise<void> {
    if (!this.enabled) {
      console.log('Slack disabled - would post lead card:', lead.id)
      return
    }

    const notification: SlackNotification = {
      text: `New lead: ${lead.firstName} ${lead.lastName} from ${lead.companyName}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*New Lead Submitted* 🎯`
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Name:*\n${lead.firstName} ${lead.lastName}`
            },
            {
              type: 'mrkdwn',
              text: `*Company:*\n${lead.companyName}`
            },
            {
              type: 'mrkdwn',
              text: `*Email:*\n${lead.workEmail}`
            },
            {
              type: 'mrkdwn',
              text: `*Source:*\n${lead.howFound}`
            }
          ]
        }
      ]
    }

    await this.sendNotification(notification)
  }

  async updateWithEnrichment(lead: any, company: any, contacts: any[]): Promise<void> {
    if (!this.enabled) {
      console.log('Slack disabled - would update with enrichment for lead:', lead.id)
      return
    }

    const notification: SlackNotification = {
      text: `Lead enriched: ${company.name} (${company.sizeEng || 0} engineers)`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Lead Enriched* 📊\n${lead.firstName} ${lead.lastName} from ${company.name}`
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Company Size:*\n${company.sizeTotal || 'Unknown'} total, ${company.sizeEng || 0} engineers`
            },
            {
              type: 'mrkdwn',
              text: `*Industry:*\n${company.industry || 'Unknown'}`
            },
            {
              type: 'mrkdwn',
              text: `*Funding:*\n${company.fundingRound || 'Unknown'}`
            },
            {
              type: 'mrkdwn',
              text: `*Contacts Found:*\n${contacts.length} contacts`
            }
          ]
        }
      ]
    }

    await this.sendNotification(notification)
  }

  async postOutreachResult(attempt: any, success: boolean): Promise<void> {
    if (!this.enabled) {
      console.log('Slack disabled - would post outreach result:', attempt.id, success)
      return
    }

    const status = success ? '✅ Sent' : '❌ Failed'
    const notification: SlackNotification = {
      text: `Outreach ${success ? 'sent' : 'failed'}: ${attempt.subject}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Outreach ${status}*\n${attempt.subject}`
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*To:*\n${attempt.contact?.email || 'Unknown'}`
            },
            {
              type: 'mrkdwn',
              text: `*Template:*\n${attempt.templateKey}`
            },
            {
              type: 'mrkdwn',
              text: `*Provider:*\n${attempt.provider}`
            },
            {
              type: 'mrkdwn',
              text: `*Status:*\n${attempt.status}`
            }
          ]
        }
      ]
    }

    await this.sendNotification(notification)
  }

  private async sendNotification(notification: SlackNotification): Promise<void> {
    if (!this.enabled || !this.webhookUrl) {
      return
    }

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(notification)
      })

      if (!response.ok) {
        throw new Error(`Slack webhook failed: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      console.error('Failed to send Slack notification:', error)
      // Don't throw - Slack failures shouldn't break the main flow
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.enabled) {
      return { success: false, error: 'Slack notifications disabled' }
    }

    if (!this.webhookUrl) {
      return { success: false, error: 'Slack webhook URL not configured' }
    }

    try {
      const testNotification: SlackNotification = {
        text: 'Factory Sales Flow - Connection Test',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*Factory Sales Flow*\n🧪 Testing Slack integration...'
            }
          }
        ]
      }

      await this.sendNotification(testNotification)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed'
      }
    }
  }
}

export default SlackNotifier