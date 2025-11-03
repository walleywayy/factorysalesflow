import { Queue, Worker } from 'bullmq'
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

export const enrichmentQueue = new Queue('enrichment', { connection: redis })
export const scoringQueue = new Queue('scoring', { connection: redis })
export const outreachQueue = new Queue('outreach', { connection: redis })

export type EnrichLeadJob = {
  leadId: string
}

export type ScoreCompanyJob = {
  companyId: string
}

export type SendOutreachJob = {
  companyId: string
  contactIds: string[]
  templateKey: string
}

export async function enqueueEnrichLead(leadId: string) {
  return enrichmentQueue.add('enrich_lead', { leadId })
}

export async function enqueueScoreCompany(companyId: string) {
  return scoringQueue.add('score_company', { companyId })
}

export async function enqueueSendOutreach(
  companyId: string,
  contactIds: string[],
  templateKey = 'A'
) {
  // Schedule 45 minutes from now
  const delay = 45 * 60 * 1000 // 45 minutes in milliseconds
  
  return outreachQueue.add(
    'send_outreach',
    { companyId, contactIds, templateKey },
    { delay }
  )
}

// Export for worker registration
export { redis }