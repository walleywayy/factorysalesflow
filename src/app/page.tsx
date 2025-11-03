import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings, Database, Mail, BarChart3 } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Factory Sales Flow
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Lightweight sales-ops automation for Factory AI. Intake leads, enrich with Clay, score with ICP rules, and automate outreach.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card>
            <CardHeader>
              <Database className="w-8 h-8 text-blue-600 mb-2" />
              <CardTitle className="text-lg">Lead Intake</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Automatic lead processing from website forms with domain extraction and validation.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="w-8 h-8 text-green-600 mb-2" />
              <CardTitle className="text-lg">Clay Enrichment</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Company and contact enrichment via Clay API with engineer count and tech stack data.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="w-8 h-8 text-purple-600 mb-2" />
              <CardTitle className="text-lg">ICP Scoring</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Automatic scoring based on engineer threshold (20+) and ICP criteria for qualified outreach.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Mail className="w-8 h-8 text-orange-600 mb-2" />
              <CardTitle className="text-lg">Auto Outreach</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                45-minute delayed personalized emails from Willem's address with A/B template testing.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="text-center space-y-4">
          <div className="space-x-4">
            <Link href="/dashboard">
              <Button size="lg">
                <BarChart3 className="w-4 h-4 mr-2" />
                View Dashboard
              </Button>
            </Link>
            <Link href="/admin/env">
              <Button variant="outline" size="lg">
                <Settings className="w-4 h-4 mr-2" />
                Environment Settings
              </Button>
            </Link>
          </div>
          
          <div className="text-sm text-gray-500">
            <p>API Endpoint: <code className="bg-gray-200 px-2 py-1 rounded">/api/leads/intake</code></p>
            <p>Admin Password: Set via <code className="bg-gray-200 px-2 py-1 rounded">ADMIN_PASSWORD</code> environment variable</p>
          </div>
        </div>

        <div className="mt-16 bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-bold mb-4">Quick Setup</h2>
          <div className="space-y-4 text-gray-600">
            <div className="flex items-start space-x-3">
              <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</div>
              <div>
                <p className="font-medium">Configure Environment</p>
                <p className="text-sm">Set up Clay API key, SMTP credentials, and scoring thresholds via the admin panel.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="bg-green-100 text-green-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</div>
              <div>
                <p className="font-medium">Start Services</p>
                <p className="text-sm">Run <code className="bg-gray-100 px-1 rounded">pnpm dev</code> to start both web server and job workers.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="bg-purple-100 text-purple-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</div>
              <div>
                <p className="font-medium">Test Integration</p>
                <p className="text-sm">Submit a test lead and monitor the processing pipeline in the dashboard.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}