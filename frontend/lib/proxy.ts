import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:3000';

/**
 * Forward a Next.js API route request to the NestJS backend,
 * automatically injecting the JWT from the httpOnly cookie.
 */
export async function proxyToBackend(
  request: NextRequest,
  backendPath: string,
  method?: string,
): Promise<NextResponse> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Forward all query-string params
  const url = new URL(`${API_BASE}${backendPath}`);
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  const resolvedMethod = method ?? request.method;
  let body: string | undefined;
  if (!['GET', 'HEAD', 'DELETE'].includes(resolvedMethod)) {
    body = await request.text();
  }

  try {
    const res = await fetch(url.toString(), {
      method: resolvedMethod,
      headers,
      body,
    });

    if (res.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { statusCode: 502, message: 'Backend unavailable' },
      { status: 502 },
    );
  }
}
