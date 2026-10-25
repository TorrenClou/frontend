import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(): Promise<Response> {
  const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:47200'
  try {
    const res = await fetch(`${backendUrl}/api/health/ready`, {
      cache: 'no-store',
    })
    const body = await res.text()
    return new Response(body, {
      status: res.status,
      headers: {
        'content-type': res.headers.get('content-type') || 'application/json',
      },
    })
  } catch {
    return NextResponse.json(
      { status: 'Unhealthy', error: 'Backend API is unreachable' },
      { status: 503 },
    )
  }
}
