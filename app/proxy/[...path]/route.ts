import type { NextRequest } from 'next/server'

/**
 * Forwards /proxy/* to the backend, resolving BACKEND_URL per request.
 *
 * This used to be a `rewrites()` entry in next.config.js. With
 * `output: 'standalone'`, Next serialises the resolved config — rewrite
 * destinations included — into .next/required-server-files.json at build time,
 * so BACKEND_URL was baked into the image and a published image only ever
 * pointed at whatever address the build machine used. Reading it here instead
 * means one image works against any backend, which is what deploying to a
 * platform that assigns the API hostname after provisioning requires.
 *
 * The browser only ever calls the relative /proxy/api path, so no backend
 * address reaches client bundles. That is unchanged.
 */

// Never prerender or cache: the whole point is per-request resolution.
export const dynamic = 'force-dynamic'

// Hop-by-hop headers are connection-scoped and must not be forwarded.
const HOP_BY_HOP = [
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]

function backendUrl(): string {
  return process.env.BACKEND_URL || 'http://localhost:47200'
}

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path } = await context.params

  const target = new URL(`${backendUrl()}/${path.join('/')}`)
  target.search = request.nextUrl.search

  const headers = new Headers(request.headers)
  for (const header of HOP_BY_HOP) headers.delete(header)
  // Host must describe the target, not the proxy, or the backend builds
  // absolute URLs pointing at itself through us.
  headers.delete('host')

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD'

  let upstream: Response
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      redirect: 'manual',
      // Required by undici whenever body is a stream.
      duplex: 'half',
    } as RequestInit & { duplex: 'half' })
  } catch (error) {
    // A backend that is down should read as a gateway failure, not a crash in
    // the web tier — the dashboard polls this path continuously.
    console.error(`[proxy] ${request.method} ${target.pathname} failed:`, error)
    return Response.json(
      { error: 'The API is unreachable.' },
      { status: 502 },
    )
  }

  const responseHeaders = new Headers(upstream.headers)
  for (const header of HOP_BY_HOP) responseHeaders.delete(header)
  // fetch has already decoded the body, so these now describe the wrong bytes.
  responseHeaders.delete('content-encoding')
  responseHeaders.delete('content-length')

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  })
}

export const GET = proxy
export const POST = proxy
export const PUT = proxy
export const PATCH = proxy
export const DELETE = proxy
export const HEAD = proxy
export const OPTIONS = proxy
