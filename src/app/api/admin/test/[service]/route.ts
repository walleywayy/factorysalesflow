import { NextRequest, NextResponse } from 'next/server'
import { ClayAdapter } from '@/lib/clay'
import { testSMTPConnection } from '@/lib/email'
import { SlackNotifier } from '@/lib/slack'

export async function POST(
  request: NextRequest,
  { params }: { params: { service: string } }
) {
  const { service } = params

  try {
    let result: { success: boolean; error?: string }

    switch (service) {
      case 'clay':
        const clay = await ClayAdapter.create()
        result = await clay.testConnection()
        break

      case 'smtp':
        result = await testSMTPConnection()
        break

      case 'slack':
        const slack = await SlackNotifier.create()
        result = await slack.testConnection()
        break

      default:
        return NextResponse.json({ success: false, error: 'Unknown service' }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error(`Test failed for ${service}:`, error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Test failed'
    }, { status: 500 })
  }
}