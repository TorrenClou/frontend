'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { KeyRound, Loader2 } from 'lucide-react'
import { useChangePassword } from '@/hooks/useSettings'

const MIN_PASSWORD_LENGTH = 12

export function AccountCard() {
    const changePassword = useChangePassword()

    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        if (newPassword.length < MIN_PASSWORD_LENGTH) {
            setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
            return
        }

        changePassword.mutate(
            { currentPassword, newPassword },
            {
                onSuccess: () => {
                    setCurrentPassword('')
                    setNewPassword('')
                    setConfirmPassword('')
                },
            }
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <KeyRound className="h-5 w-5" />
                    Account
                </CardTitle>
                <CardDescription>Change the password you sign in with</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="max-w-sm space-y-3">
                    <Input
                        type="password"
                        placeholder="Current password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        disabled={changePassword.isPending}
                        autoComplete="current-password"
                    />
                    <Input
                        type="password"
                        placeholder={`New password (at least ${MIN_PASSWORD_LENGTH} characters)`}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={changePassword.isPending}
                        autoComplete="new-password"
                    />
                    <Input
                        type="password"
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={changePassword.isPending}
                        autoComplete="new-password"
                    />

                    {error && <p className="text-sm text-danger">{error}</p>}

                    <Button
                        type="submit"
                        disabled={
                            changePassword.isPending || !currentPassword || !newPassword || !confirmPassword
                        }
                    >
                        {changePassword.isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Changing...
                            </>
                        ) : (
                            'Change password'
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}
