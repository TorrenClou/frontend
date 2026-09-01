'use client'

import { useState, useEffect } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, CloudDownload, Check, Mail, Lock, Code } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useSetupGate } from '@/hooks/useSetupGate'

const features = [
  {
    title: 'Selective File Downloads',
    description:
      "Pick exactly which files to grab during analysis. Skip what you don't need, save what matters.",
  },
  {
    title: 'Multi-Cloud Storage',
    description:
      'Upload directly to Google Drive, AWS S3, Backblaze B2, Cloudflare R2, or any S3-compatible endpoint.',
  },
  {
    title: 'Live Job Tracking',
    description:
      'Monitor active transfers with real-time progress bars, step-by-step timelines, and automatic retry on failure.',
  },
]

export default function LandingPage() {
  const router = useRouter()
  const { status } = useSession()
  const checkingSetup = useSetupGate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Redirect already-authenticated users away from the login page
  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/dashboard')
    }
  }, [status, router])

  // Show nothing while the session is resolving or redirecting to avoid flicker.
  // The setup check is included: on an unclaimed instance this page is about to redirect
  // to the wizard, and flashing a login form nobody can use first is worse than a pause.
  if (status === 'loading' || status === 'authenticated' || checkingSetup) {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password) {
      toast.error('Please enter email and password')
      return
    }

    setIsLoading(true)
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        toast.error('Invalid email or password')
      } else if (result?.ok) {
        toast.success('Login successful!')
        router.push('/dashboard')
        router.refresh()
      }
    } catch (error) {
      console.error('Sign in error:', error)
      toast.error('An error occurred during sign in')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-screen overflow-y-auto flex flex-col lg:flex-row bg-background text-foreground antialiased">

      {/* LEFT SIDE — Branding */}
      <div className="relative w-full lg:w-1/2 flex flex-col justify-center p-8 lg:p-16 xl:p-24 overflow-hidden">

        {/* Background glow decorations */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[10%] w-[300px] h-[300px] rounded-full bg-primary/10 blur-[100px]" />
        </div>

        <div className="relative z-10 flex flex-col gap-10 max-w-xl mx-auto lg:mx-0">

          {/* Logo + Wordmark */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-16 h-16 rounded-xl gradient-primary shadow-[0_0_20px_rgba(18,135,117,0.25)]">
              <CloudDownload className="w-8 h-8 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight">TorrenClou</span>
          </div>

          {/* Headline */}
          <div className="space-y-4">
            <h1 className="text-4xl lg:text-5xl font-black leading-[1.1] tracking-tight">
              Your torrents.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-300">
                Your cloud.
              </span><br />
              Your server.
            </h1>
            <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
              The open-source bridge between BitTorrent and your personal cloud storage.
              Self-hosted, private, and containerized.
            </p>
          </div>

          {/* Feature list */}
          <ul className="space-y-5">
            {features.map((feature) => (
              <li key={feature.title} className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-primary" strokeWidth={3} />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{feature.description}</p>
                </div>
              </li>
            ))}
          </ul>

        </div>
      </div>

      {/* RIGHT SIDE — Login Card */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-4 sm:p-8 relative">

        {/* Subtle dot-grid background */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(hsl(var(--primary)) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="w-full max-w-md relative z-10">

          {/* Card */}
          <div className="bg-card border border-border rounded-xl shadow-2xl p-8 flex flex-col gap-6">

            {/* Card Header */}
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold">Welcome back</h2>
              <p className="text-sm text-muted-foreground">Sign in to manage your instance</p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">

              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium text-muted-foreground">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium text-muted-foreground">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In to Instance'
                )}
              </Button>

            </form>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <a
              href="https://github.com/torrenclou/torrenclou"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Code className="w-3.5 h-3.5" />
              Open Source on GitHub
            </a>
          </div>

        </div>
      </div>

    </div>
  )
}
