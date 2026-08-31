'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import { cn } from '@/lib/utils'

/**
 * Application chrome for every signed-in page.
 *
 * The sidebar is a permanent column from `lg` up and an off-canvas drawer below it —
 * a fixed 16rem rail leaves roughly 7rem of usable width on a phone, which is not a
 * layout so much as an absence of one. Drawer state lives here because the trigger
 * (Topbar) and the panel (Sidebar) are siblings.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
    const [mobileNavOpen, setMobileNavOpen] = useState(false)
    const pathname = usePathname()

    // Navigating is the whole reason the drawer is open, so close it on arrival.
    useEffect(() => {
        setMobileNavOpen(false)
    }, [pathname])

    // Escape is the expected way out of an overlay.
    //
    // No body scroll lock here on purpose: globals.css already sets
    // `html, body { overflow: hidden }` and this shell scrolls its <main> instead,
    // so locking the body would be a no-op. The overlay is what stops the content
    // behind the drawer from being scrolled.
    useEffect(() => {
        if (!mobileNavOpen) return

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setMobileNavOpen(false)
        }

        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [mobileNavOpen])

    return (
        <div className="flex h-[100dvh] overflow-hidden">
            {/* Permanent rail, large screens only */}
            <div className="hidden lg:flex">
                <Sidebar />
            </div>

            {/* Off-canvas drawer, below lg */}
            <div
                className={cn(
                    'fixed inset-0 z-50 lg:hidden',
                    mobileNavOpen ? 'pointer-events-auto' : 'pointer-events-none'
                )}
                aria-hidden={!mobileNavOpen}
            >
                <div
                    className={cn(
                        'absolute inset-0 bg-black/60 transition-opacity duration-200',
                        mobileNavOpen ? 'opacity-100' : 'opacity-0'
                    )}
                    onClick={() => setMobileNavOpen(false)}
                />
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Main navigation"
                    className={cn(
                        'absolute inset-y-0 left-0 w-[17rem] max-w-[85vw] shadow-xl transition-transform duration-200 ease-out',
                        mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
                    )}
                >
                    <Sidebar
                        className="w-full"
                        showCloseButton
                        onClose={() => setMobileNavOpen(false)}
                    />
                </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <Topbar onOpenMobileNav={() => setMobileNavOpen(true)} />
                {/* Tighter gutters on small screens — 1.5rem each side is a lot of a
                    375px viewport to spend on whitespace. */}
                <main className="min-h-0 flex-1 overflow-auto bg-background p-4 sm:p-6">
                    {children}
                </main>
            </div>
        </div>
    )
}
