'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FileText, Loader2, Mail, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { useSetupGate } from '@/hooks/useSetupGate'

export default function LoginPage() {
    const router = useRouter()
    const checkingSetup = useSetupGate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)

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

    // An unclaimed instance redirects to the wizard from here, so hold the form back
    // rather than flash a login nobody has credentials for yet.
    if (checkingSetup) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-primary/20 via-background to-teal-secondary/20">
            <div className="w-full max-w-md space-y-8 rounded-xl border bg-card p-8 shadow-2xl">
                {/* Logo */}
                <div className="flex flex-col items-center space-y-2">
                    <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-teal-primary to-teal-secondary">
                        <FileText className="h-8 w-8 text-gray-900" />
                    </div>
                    <h1 className="text-2xl font-bold">TorreClou</h1>
                    <p className="text-center text-sm text-muted-foreground">
                        Download torrents directly to your cloud storage
                    </p>
                </div>

                {/* Welcome Message */}
                <div className="space-y-2 text-center">
                    <h2 className="text-xl font-semibold">Welcome back</h2>
                    <p className="text-sm text-muted-foreground">
                        Sign in to your account to continue
                    </p>
                </div>

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                type="email"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="pl-10"
                                disabled={isLoading}
                                autoComplete="email"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pl-10"
                                disabled={isLoading}
                                autoComplete="current-password"
                            />
                        </div>
                    </div>
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full"
                        size="lg"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Signing in...
                            </>
                        ) : (
                            'Sign in'
                        )}
                    </Button>
                </form>

                {/* Terms */}
                <p className="text-center text-xs text-muted-foreground">
                    By signing in, you agree to our{' '}
                    <a href="/terms" className="text-primary hover:underline">
                        Terms of Service
                    </a>{' '}
                    and{' '}
                    <a href="/privacy" className="text-primary hover:underline">
                        Privacy Policy
                    </a>
                </p>
            </div>
        </div>
    )
}
