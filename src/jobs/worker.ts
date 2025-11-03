import { Worker } from 'bullmq'
import { redis } from '@/lib/queue'
import { processEnrichLead, processScoreCompany, processSendOutreach } from './processors'

console.log('Starting job workers...')

// Enrichment worker
const enrichmentWorker = new Worker(
  'enrichment',
  async (job) => {
    console.log(`Processing enrichment job: ${job.id}`)
    await processEnrichLead(job)
  },
  {
    connection: redis,
    concurrency: 5
  }
)

// Scoring worker
const scoringWorker = new Worker(
  'scoring',
  async (job) => {
    console.log(`Processing scoring job: ${job.id}`)
    await processScoreCompany(job)
  },
  {
    connection: redis,
    concurrency: 10
  }
)

// Outreach worker
const outreachWorker = new Worker(
  'outreach',
  async (job) => {
    console.log(`Processing outreach job: ${job.id}`)
    await processSendOutreach(job)
  },
  {
    connection: redis,
    concurrency: 3 // Limit email sending concurrency
  }
)

// Error handling
enrichmentWorker.on('failed', (job, err) => {
  console.error(`Enrichment job ${job?.id} failed:`, err)
})

scoringWorker.on('failed', (job, err) => {
  console.error(`Scoring job ${job?.id} failed:`, err)
})

outreachWorker.on('failed', (job, err) => {
  console.error(`Outreach job ${job?.id} failed:`, err)
})

// Success logging
enrichmentWorker.on('completed', (job) => {
  console.log(`Enrichment job ${job.id} completed`)
})

scoringWorker.on('completed', (job) => {
  console.log(`Scoring job ${job.id} completed`)
})

outreachWorker.on('completed', (job) => {
  console.log(`Outreach job ${job.id} completed`)
})

console.log('Job workers started successfully')

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down workers...')
  await Promise.all([
    enrichmentWorker.close(),
    scoringWorker.close(),
    outreachWorker.close()
  ])
  await redis.quit()
  process.exit(0)
})