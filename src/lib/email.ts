import nodemailer from 'nodemailer'
import { getConfig } from './config'

export interface EmailOptions {
  to: string
  subject: string
  body: string
  fromName?: string
  fromEmail?: string
}

export interface EmailResult {
  success: boolean
  provider: 'smtp' | 'mailto'
  messageId?: string
  status: string
  error?: string
  mailtoLink?: string
}

export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  const config = await getConfig()
  
  // Check if SMTP is configured
  if (config.smtp.user && config.smtp.pass) {
    return await sendSMTPEmail(options, config)
  } else {
    return createMailtoLink(options, config)
  }
}

async function sendSMTPEmail(options: EmailOptions, config: any): Promise<EmailResult> {
  try {
    const transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass
      }
    })
    
    const result = await transporter.sendMail({
      from: `${options.fromName || config.smtp.fromName} <${options.fromEmail || config.smtp.fromEmail}>`,
      to: options.to,
      subject: options.subject,
      text: options.body,
      html: options.body.replace(/\n/g, '<br>')
    })
    
    return {
      success: true,
      provider: 'smtp',
      messageId: result.messageId,
      status: 'sent'
    }
  } catch (error) {
    console.error('SMTP send error:', error)
    return {
      success: false,
      provider: 'smtp',
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

function createMailtoLink(options: EmailOptions, config: any): EmailResult {
  const fromEmail = options.fromEmail || config.smtp.fromEmail
  const subject = encodeURIComponent(options.subject)
  const body = encodeURIComponent(options.body)
  
  const mailtoLink = `mailto:${options.to}?subject=${subject}&body=${body}&from=${fromEmail}`
  
  return {
    success: true,
    provider: 'mailto',
    status: 'needs_manual_send',
    mailtoLink
  }
}

export async function testSMTPConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const config = await getConfig()
    
    if (!config.smtp.user || !config.smtp.pass) {
      return { success: false, error: 'SMTP credentials not configured' }
    }
    
    const transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass
      }
    })
    
    await transporter.verify()
    
    // Send test email
    const result = await transporter.sendMail({
      from: `${config.smtp.fromName} <${config.smtp.fromEmail}>`,
      to: config.smtp.fromEmail,
      subject: 'Factory Sales Flow - SMTP Test',
      text: 'This is a test email to verify SMTP configuration is working properly.'
    })
    
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'SMTP test failed'
    }
  }
}