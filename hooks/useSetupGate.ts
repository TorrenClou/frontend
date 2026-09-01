'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSetupStatus } from '@/lib/api/setup'

/**
 * Sends a visitor to the first-run wizard when this instance has never been claimed.
 *
 * Used on the two pages an unconfigured instance can be reached through — the landing
 * page and /login — rather than in middleware, which runs on every matched request and
 * would put a backend round-trip in front of all of them.
 *
 * @returns whether the check is still in flight, so the caller can hold off rendering a
 * login form that the visitor is about to be redirected away from.
 */
export function useSetupGate(): boolean {
    const router = useRouter()
    const [checking, setChecking] = useState(true)

    useEffect(() => {
        let active = true

        getSetupStatus()
            .then((status) => {
                if (!active) return

                if (status.needsSetup) {
                    router.replace('/setup')
                    return
                }

                setChecking(false)
            })
            .catch(() => {
                // Backend unreachable, or an older backend with no setup endpoint. Fall
                // through to the login form, which reports the real failure on submit.
                if (active) setChecking(false)
            })

        return () => {
            active = false
        }
    }, [router])

    return checking
}
