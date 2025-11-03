import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { enqueueEnrichLead } from '@/lib/queue'

const leadSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  company: z.string().min(1, 'Company is required'),
  work_email: z.string().email('Valid work email is required'),
  how_did_you_find_us: z.string().min(1, 'How did you find us is required')
})

function extractDomain(email: string): string {
  const domain = email.split('@')[1]?.toLowerCase()
  
  // Filter out common disposable/role email domains
  const disposableDomains = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
    'aol.com', 'icloud.com', 'me.com', 'mail.com'
  ]
  
  const rolePatterns = [
    'noreply', 'no-reply', 'donotreply', 'info', 'admin', 
    'support', 'help', 'contact', 'sales', 'marketing'
  ]
  
  const localPart = email.split('@')[0]?.toLowerCase()
  const isRoleEmail = rolePatterns.some(pattern => localPart.includes(pattern))
  
  if (disposableDomains.includes(domain) || isRoleEmail) {
    return '' // Will be handled as no domain
  }
  
  return domain
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = leadSchema.parse(body)
    
    // Extract company domain from work email
    const companyDomain = extractDomain(validatedData.work_email)
    
    // Create lead record
    const lead = await db.lead.create({
      data: {
        firstName: validatedData.first_name,
        lastName: validatedData.last_name,
        companyName: validatedData.company,
        workEmail: validatedData.work_email,
        howFound: validatedData.how_did_you_find_us,
        companyDomain: companyDomain || null,
        payloadJson: body, // Store raw payload
        source: 'website',
        status: 'new'
      }
    })
    
    // Enqueue enrichment job
    await enqueueEnrichLead(lead.id)
    
    return NextResponse.json({
      success: true,
      leadId: lead.id,
      message: 'Lead submitted successfully'
    }, { status: 201 })
    
  } catch (error) {
    console.error('Lead intake error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 })
    }
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}