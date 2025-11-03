'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Eye, EyeOff, TestTube, Save, AlertCircle, CheckCircle } from 'lucide-react'

interface Config {
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

export default function AdminEnvPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showPasswords, setShowPasswords] = useState(false)
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({})

  useEffect(() => {
    if (isAuthenticated) {
      loadConfig()
    }
  }, [isAuthenticated])

  const handleAuth = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })
      
      if (response.ok) {
        setIsAuthenticated(true)
      } else {
        alert('Invalid password')
      }
    } catch (error) {
      alert('Authentication failed')
    }
    setLoading(false)
  }

  const loadConfig = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/config')
      if (response.ok) {
        const data = await response.json()
        setConfig(data)
      }
    } catch (error) {
      console.error('Failed to load config:', error)
    }
    setLoading(false)
  }

  const saveConfig = async () => {
    if (!config) return
    
    setSaving(true)
    try {
      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })
      
      if (response.ok) {
        alert('Configuration saved successfully!')
      } else {
        alert('Failed to save configuration')
      }
    } catch (error) {
      alert('Failed to save configuration')
    }
    setSaving(false)
  }

  const testConnection = async (service: 'clay' | 'smtp' | 'slack') => {
    try {
      const response = await fetch(`/api/admin/test/${service}`, {
        method: 'POST'
      })
      const result = await response.json()
      
      setTestResults(prev => ({
        ...prev,
        [service]: {
          success: result.success,
          message: result.error || 'Connection successful!'
        }
      }))
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [service]: {
          success: false,
          message: 'Test failed'
        }
      }))
    }
  }

  const updateConfig = (path: string, value: any) => {
    if (!config) return
    
    const keys = path.split('.')
    const newConfig = { ...config }
    let current = newConfig as any
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]]
    }
    
    current[keys[keys.length - 1]] = value
    setConfig(newConfig)
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Admin Access</CardTitle>
            <CardDescription>Enter admin password to manage environment settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="Admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
            />
            <Button onClick={handleAuth} disabled={loading} className="w-full">
              {loading ? 'Authenticating...' : 'Login'}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading configuration...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Environment Settings</h1>
            <p className="text-gray-600">Manage API keys, SMTP, and system configuration</p>
          </div>
          <Button onClick={saveConfig} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save All'}
          </Button>
        </div>

        {/* Clay Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Clay API Configuration
              <Button
                variant="outline"
                size="sm"
                onClick={() => testConnection('clay')}
              >
                <TestTube className="w-4 h-4 mr-2" />
                Test
              </Button>
            </CardTitle>
            <CardDescription>Configure Clay enrichment API</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">API Key</label>
              <div className="relative">
                <Input
                  type={showPasswords ? 'text' : 'password'}
                  value={config.clay.apiKey}
                  onChange={(e) => updateConfig('clay.apiKey', e.target.value)}
                  placeholder="Enter Clay API key"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2"
                  onClick={() => setShowPasswords(!showPasswords)}
                >
                  {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            {testResults.clay && (
              <div className={`flex items-center space-x-2 text-sm ${testResults.clay.success ? 'text-green-600' : 'text-red-600'}`}>
                {testResults.clay.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{testResults.clay.message}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SMTP Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              SMTP Configuration
              <Button
                variant="outline"
                size="sm"
                onClick={() => testConnection('smtp')}
              >
                <TestTube className="w-4 h-4 mr-2" />
                Test
              </Button>
            </CardTitle>
            <CardDescription>Configure email sending (Gmail/Workspace recommended)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">SMTP Host</label>
                <Input
                  value={config.smtp.host}
                  onChange={(e) => updateConfig('smtp.host', e.target.value)}
                  placeholder="smtp.gmail.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">SMTP Port</label>
                <Input
                  type="number"
                  value={config.smtp.port}
                  onChange={(e) => updateConfig('smtp.port', parseInt(e.target.value))}
                  placeholder="587"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Username</label>
              <Input
                value={config.smtp.user}
                onChange={(e) => updateConfig('smtp.user', e.target.value)}
                placeholder="your-email@gmail.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <Input
                type={showPasswords ? 'text' : 'password'}
                value={config.smtp.pass}
                onChange={(e) => updateConfig('smtp.pass', e.target.value)}
                placeholder="App password or OAuth token"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">From Name</label>
                <Input
                  value={config.smtp.fromName}
                  onChange={(e) => updateConfig('smtp.fromName', e.target.value)}
                  placeholder="Willem Alleyne"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">From Email</label>
                <Input
                  value={config.smtp.fromEmail}
                  onChange={(e) => updateConfig('smtp.fromEmail', e.target.value)}
                  placeholder="willem.alleyne@princeton.edu"
                />
              </div>
            </div>
            {testResults.smtp && (
              <div className={`flex items-center space-x-2 text-sm ${testResults.smtp.success ? 'text-green-600' : 'text-red-600'}`}>
                {testResults.smtp.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{testResults.smtp.message}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scoring Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Scoring Rules</CardTitle>
            <CardDescription>Configure ICP criteria and thresholds</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Engineer Threshold</label>
              <Input
                type="number"
                value={config.scoring.engineerThreshold}
                onChange={(e) => updateConfig('scoring.engineerThreshold', parseInt(e.target.value))}
                placeholder="20"
              />
              <p className="text-xs text-gray-500 mt-1">Minimum number of engineers for auto-outreach</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Target Industries (comma-separated)</label>
              <Input
                value={config.scoring.icpToggles.industries.join(', ')}
                onChange={(e) => updateConfig('scoring.icpToggles.industries', e.target.value.split(',').map(s => s.trim()))}
                placeholder="SaaS, AI/ML, DevTools"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Target Geos (comma-separated)</label>
              <Input
                value={config.scoring.icpToggles.geos.join(', ')}
                onChange={(e) => updateConfig('scoring.icpToggles.geos', e.target.value.split(',').map(s => s.trim()))}
                placeholder="US, EU"
              />
            </div>
          </CardContent>
        </Card>

        {/* Slack Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Slack Integration
              <Button
                variant="outline"
                size="sm"
                onClick={() => testConnection('slack')}
                disabled={!config.slack.enabled}
              >
                <TestTube className="w-4 h-4 mr-2" />
                Test
              </Button>
            </CardTitle>
            <CardDescription>Optional Slack notifications (coming soon)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.slack.enabled}
                onChange={(e) => updateConfig('slack.enabled', e.target.checked)}
                className="rounded"
              />
              <label className="text-sm font-medium">Enable Slack notifications</label>
            </div>
            {config.slack.enabled && (
              <div>
                <label className="block text-sm font-medium mb-2">Webhook URL</label>
                <Input
                  type={showPasswords ? 'text' : 'password'}
                  value={config.slack.webhookUrl || ''}
                  onChange={(e) => updateConfig('slack.webhookUrl', e.target.value)}
                  placeholder="https://hooks.slack.com/services/..."
                />
              </div>
            )}
            {testResults.slack && (
              <div className={`flex items-center space-x-2 text-sm ${testResults.slack.success ? 'text-green-600' : 'text-red-600'}`}>
                {testResults.slack.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{testResults.slack.message}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}