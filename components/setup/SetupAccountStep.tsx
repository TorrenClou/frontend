'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Lock, Mail, User } from 'lucide-react'
import { toast } from 'sonner'
import { createAdmin, createAdminRequestSchema } from '@/lib/api/setup'
import { extractApiError } from '@/lib/api/errors'

const MIN_PASSWORD_LENGTH = 12

interface SetupAccountStepProps {
    onComplete: () => void
}

/**
 * Creates the admin account, then signs in with it.
 *
 * The sign-in matters as much as the account: every later step needs a session, and the
 * account was just created with these exact credentials, so asking the user to type them
 * again would be pure ceremony.
 */
export function SetupAccountStep({ onComplete }: SetupAccountStepProps) {
    const [email, setEmail] = useState('')
    const [fullName, setFullName] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (password !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        const parsed = createAdminRequestSchema.safeParse({ email, fullName, password })
        if (!parsed.success) {
            setError(parsed.error.issues[0]?.message ?? 'Check the details above')
            return
        }

        setIsSubmitting(true)
        try {
            await createAdmin(parsed.data)

            const result = await signIn('credentials', {
                email: parsed.data.email,
                password: parsed.data.password,
                redirect: false,
            })

            if (result?.error) {
                // The account exists — only the session failed, so send them to the login
                // page rather than back through a wizard that will now refuse them.
                toast.error('Account created, but sign-in failed. Please log in.')
                window.location.href = '/login'
                return
            }

            onComplete()
        } catch (err: unknown) {
            const extracted = extractApiError(err)

            if (extracted.code === 'SetupAlreadyComplete') {
                toast.error('This instance has already been set up')
                window.location.href = '/login'
                return
            }

            setError(extracted.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    type="text"
                    placeholder="Your name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10"
                    disabled={isSubmitting}
                    autoComplete="name"
                />
            </div>

            <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    disabled={isSubmitting}
                    autoComplete="username"
                />
            </div>

            <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    type="password"
                    placeholder={`Password (at least ${MIN_PASSWORD_LENGTH} characters)`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    disabled={isSubmitting}
                    autoComplete="new-password"
                />
            </div>

            <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    type="password"
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    disabled={isSubmitting}
                    autoComplete="new-password"
                />
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <Button type="submit" disabled={isSubmitting} className="w-full" size="lg">
                {isSubmitting ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                    </>
                ) : (
                    'Create account'
                )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
                This is the only account on this instance. There is no password reset — store
                it somewhere you will not lose it.
            </p>
        </form>
    )
}
