import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Credenciales directas para asegurar que funcione
const SUPABASE_URL = 'https://wscijkxwevgxbgwhbqtm.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzY2lqa3h3ZXZneGJnd2hicXRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE4MjI3NjgsImV4cCI6MjA1NzM5ODc2OH0._HSnvof7NUk6J__qqq3gJvbJRZnItCAmlI5HYAL8WVI'

export async function middleware(request: NextRequest) {
  // Obtener la ruta
  const path = request.nextUrl.pathname;

  // Si la ruta es /register-bot-response, redirigir a /api/register-bot-response
  if (path === '/register-bot-response') {
    return NextResponse.rewrite(new URL('/api/register-bot-response', request.url));
  }

  console.log('Middleware ejecutándose para:', path);
  
  // Si es una solicitud para el dashboard directamente, permitirla
  if (path === '/dashboard') {
    console.log('Acceso directo al dashboard permitido');
    return NextResponse.next();
  }
  
  const res = NextResponse.next()
  
  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          res.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          res.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  console.log('Sesión encontrada:', !!session);

  // Si el usuario no está autenticado y trata de acceder a una ruta protegida
  if (!session && path.startsWith('/dashboard')) {
    console.log('Usuario no autenticado intentando acceder a ruta protegida');
    const redirectUrl = new URL('/login', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  // Si el usuario está autenticado y trata de acceder a login
  if (session && path === '/login') {
    console.log('Usuario autenticado intentando acceder a login');
    const redirectUrl = new URL('/dashboard', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/dashboard', '/register-bot-response']
} 