import { Job } from 'bullmq'
import { db } from '@/lib/db'
import { ClayAdapter } from '@/lib/clay'
import { getConfig } from '@/lib/config'
import { enqueueScoreCompany, enqueueSendOutreach } from '@/lib/queue'
import type { EnrichLeadJob, ScoreCompanyJob, SendOutreachJob } from '@/lib/queue'
import { sendEmail } from '@/lib/email'

export async function processEnrichLead(job: Job<EnrichLeadJob>) {
  const { leadId } = job.data
  
  try {
    // Get lead and check if it needs enrichment
    const lead = await db.lead.findUnique({
      where: { id: leadId }
    })
    
    if (!lead) {
      throw new Error(`Lead ${leadId} not found`)
    }
    
    if (!lead.companyDomain) {
      console.log(`Skipping enrichment for lead ${leadId} - no valid company domain`)
      return
    }
    
    // Check if company already exists and is recently enriched
    let company = await db.company.findUnique({
      where: { domain: lead.companyDomain }
    })
    
    const needsEnrichment = !company || 
      !company.lastEnrichedAt || 
      (Date.now() - company.lastEnrichedAt.getTime()) > 7 * 24 * 60 * 60 * 1000 // 7 days
    
    if (needsEnrichment) {
      // Enrich company data via Clay
      const clay = await ClayAdapter.create()
      const enrichmentResult = await clay.enrichCompany(lead.companyDomain)
      
      // Log enrichment attempt
      await db.enrichmentRun.create({
        data: {
          subjectType: 'company',
          subjectId: company?.id || 'unknown',
          provider: 'clay',
          requestJson: { domain: lead.companyDomain },
          responseJson: enrichmentResult.rawResponse,
          success: enrichmentResult.success,
          errorText: enrichmentResult.error
        }
      })
      
      if (enrichmentResult.success && enrichmentResult.company) {
        // Upsert company
        company = await db.company.upsert({
          where: { domain: lead.companyDomain },
          update: {
            name: enrichmentResult.company.name,
            linkedinUrl: enrichmentResult.company.linkedinUrl,
            sizeTotal: enrichmentResult.company.employeeCount,
            sizeEng: enrichmentResult.company.engineerCount,
            industry: enrichmentResult.company.industry,
            fundingRound: enrichmentResult.company.fundingRound,
            fundingDate: enrichmentResult.company.fundingDate ? new Date(enrichmentResult.company.fundingDate) : null,
            techStackJson: enrichmentResult.company.technologies,
            lastEnrichedAt: new Date()
          },
          create: {
            domain: lead.companyDomain,
            name: enrichmentResult.company.name,
            linkedinUrl: enrichmentResult.company.linkedinUrl,
            sizeTotal: enrichmentResult.company.employeeCount,
            sizeEng: enrichmentResult.company.engineerCount,
            industry: enrichmentResult.company.industry,
            fundingRound: enrichmentResult.company.fundingRound,
            fundingDate: enrichmentResult.company.fundingDate ? new Date(enrichmentResult.company.fundingDate) : null,
            techStackJson: enrichmentResult.company.technologies,
            lastEnrichedAt: new Date()
          }
        })
        
        // Store contacts
        if (enrichmentResult.contacts) {
          for (const contactData of enrichmentResult.contacts) {
            await db.contact.upsert({
              where: { 
                companyId_email: {
                  companyId: company.id,
                  email: contactData.email
                }
              },
              update: {
                name: contactData.name,
                title: contactData.title,
                seniority: contactData.seniority,
                roleFunction: contactData.roleFunction,
                linkedinUrl: contactData.linkedinUrl,
                emailConfidence: contactData.emailConfidence
              },
              create: {
                companyId: company.id,
                email: contactData.email,
                name: contactData.name,
                title: contactData.title,
                seniority: contactData.seniority,
                roleFunction: contactData.roleFunction,
                linkedinUrl: contactData.linkedinUrl,
                emailConfidence: contactData.emailConfidence
              }
            })
          }
        }
      }
    }
    
    // Update lead status
    await db.lead.update({
      where: { id: leadId },
      data: { status: 'enriched' }
    })
    
    // Enqueue scoring if we have a company
    if (company) {
      await enqueueScoreCompany(company.id)
    }
    
  } catch (error) {
    console.error(`Error processing enrich_lead job ${leadId}:`, error)
    throw error
  }
}

export async function processScoreCompany(job: Job<ScoreCompanyJob>) {
  const { companyId } = job.data
  
  try {
    const config = await getConfig()
    
    const company = await db.company.findUnique({
      where: { id: companyId },
      include: { contacts: true }
    })
    
    if (!company) {
      throw new Error(`Company ${companyId} not found`)
    }
    
    // Calculate ICP fit
    const icpFit = calculateICPFit(company, config)
    
    // Calculate engineer threshold
    const engineerThreshold = company.sizeEng || 0
    const meetsThreshold = engineerThreshold >= config.scoring.engineerThreshold
    
    // Determine decision
    let decision = 'DISQUALIFIED'
    const reasons: string[] = []
    
    if (icpFit) {
      reasons.push('Meets ICP criteria')
      if (meetsThreshold) {
        reasons.push(`Has ${engineerThreshold} engineers (>= ${config.scoring.engineerThreshold})`)
        decision = 'AUTO_OUTREACH'
      } else {
        reasons.push(`Only ${engineerThreshold} engineers (< ${config.scoring.engineerThreshold})`)
        decision = 'REVIEW'
      }
    } else {
      reasons.push('Does not meet ICP criteria')
    }
    
    // Create score record
    const score = await db.score.create({
      data: {
        companyId,
        ruleVersion: 'v0',
        scoreNum: icpFit && meetsThreshold ? 100 : icpFit ? 50 : 0,
        reasonsJson: reasons,
        decision
      }
    })
    
    // Update company ICP fit
    await db.company.update({
      where: { id: companyId },
      data: { icpFit }
    })
    
    // If qualified for auto outreach, enqueue outreach
    if (decision === 'AUTO_OUTREACH' && company.contacts.length > 0) {
      const targetContacts = company.contacts
        .filter(c => ['director', 'vp', 'c-level', 'manager'].includes(c.seniority || ''))
        .slice(0, 3) // Limit to top 3 contacts
      
      if (targetContacts.length > 0) {
        await enqueueSendOutreach(
          companyId,
          targetContacts.map(c => c.id),
          Math.random() > 0.5 ? 'A' : 'B' // Random template selection
        )
      }
    }
    
  } catch (error) {
    console.error(`Error processing score_company job ${companyId}:`, error)
    throw error
  }
}

export async function processSendOutreach(job: Job<SendOutreachJob>) {
  const { companyId, contactIds, templateKey } = job.data
  
  try {
    const config = await getConfig()
    
    const company = await db.company.findUnique({
      where: { id: companyId },
      include: { 
        contacts: {
          where: { id: { in: contactIds } }
        },
        leads: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    })
    
    if (!company) {
      throw new Error(`Company ${companyId} not found`)
    }
    
    const primaryContact = company.contacts[0]
    if (!primaryContact) {
      throw new Error(`No contacts found for company ${companyId}`)
    }
    
    const lead = company.leads[0]
    const template = config.emailTemplates[templateKey]
    
    if (!template) {
      throw new Error(`Template ${templateKey} not found`)
    }
    
    // Personalize email content
    const personalizedContent = personalizeEmail(template, {
      first_name: lead?.firstName || primaryContact.name.split(' ')[0],
      role: primaryContact.title || 'team member',
      company: company.name,
      eng_size: company.sizeEng?.toString() || 'your',
      recent_event: company.fundingRound ? `${company.fundingRound} funding` : 'growth',
      relevant_stack: (company.techStackJson as string[] || []).slice(0, 3).join(', ') || 'modern technologies',
      value_one_liner: 'Our AI agents have helped similar companies reduce operational overhead by 60%.',
      cta: 'Interested in a quick 15-minute demo?'
    })
    
    // Send email
    const emailResult = await sendEmail({
      to: primaryContact.email,
      subject: personalizedContent.subject,
      body: personalizedContent.body,
      fromName: config.smtp.fromName,
      fromEmail: config.smtp.fromEmail
    })
    
    // Record outreach attempt
    await db.outreachAttempt.create({
      data: {
        companyId,
        leadId: lead?.id,
        contactId: primaryContact.id,
        provider: emailResult.provider,
        templateKey,
        subject: personalizedContent.subject,
        body: personalizedContent.body,
        providerMessageId: emailResult.messageId,
        status: emailResult.status,
        eventsJson: {}
      }
    })
    
  } catch (error) {
    console.error(`Error processing send_outreach job ${companyId}:`, error)
    throw error
  }
}

function calculateICPFit(company: any, config: any): boolean {
  const { icpToggles } = config.scoring
  
  // Check industry fit
  const industryFit = !company.industry || 
    icpToggles.industries.some((industry: string) => 
      company.industry?.toLowerCase().includes(industry.toLowerCase())
    )
  
  // Check funding stage (if available)
  const stageFit = !company.fundingRound || 
    company.fundingRound.toLowerCase() !== 'pre-seed'
  
  // For now, assume geo fit (would need additional data)
  const geoFit = true
  
  return industryFit && stageFit && geoFit
}

function personalizeEmail(template: any, vars: Record<string, string>) {
  let subject = template.subject
  let body = template.body
  
  for (const [key, value] of Object.entries(vars)) {
    const placeholder = `{{${key}}}`
    subject = subject.replace(new RegExp(placeholder, 'g'), value)
    body = body.replace(new RegExp(placeholder, 'g'), value)
  }
  
  return { subject, body }
}