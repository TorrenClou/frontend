'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function CallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const errorParam = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    if (errorParam) {
      setStatus('error')
      setError(errorDescription || 'Authentication failed. Please try again.')
      return
    }

    const timer = setTimeout(() => {
      setStatus('success')
      setTimeout(() => {
        router.push('/dashboard')
      }, 800)
    }, 800)

    return () => clearTimeout(timer)
  }, [searchParams, router])

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle>
          {status === 'loading' && 'Completing Sign In'}
          {status === 'success' && 'Welcome!'}
          {status === 'error' && 'Sign In Failed'}
        </CardTitle>
        <CardDescription>
          {status === 'loading' && 'Please wait while we complete your sign in...'}
          {status === 'success' && 'Redirecting you to the dashboard...'}
          {status === 'error' && 'There was a problem signing you in.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-4">
        {status === 'loading' && <Loader2 className="h-10 w-10 animate-spin text-primary" />}

        {status === 'success' && (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/20">
            <CheckCircle className="h-7 w-7 text-success-medium" />
          </div>
        )}

        {status === 'error' && (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/20">
              <AlertCircle className="h-7 w-7 text-danger-medium" />
            </div>
            {error && <p className="text-center text-sm text-muted-foreground">{error}</p>}
            <Button onClick={() => router.push('/')} className="w-full">
              Back to Sign In
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function CallbackLoading() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle>Completing Sign In</CardTitle>
        <CardDescription>Please wait while we complete your sign in...</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </CardContent>
    </Card>
  )
}

export default function CallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/15 via-background to-primary/5 p-4">
      <Suspense fallback={<CallbackLoading />}>
        <CallbackContent />
      </Suspense>
    </div>
  )
}