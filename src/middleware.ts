import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'fallback_dev_secret_troque_em_producao'
);

const ROTAS_PUBLICAS = ['/', '/login', '/register', '/forgot-password', '/reset-password'];

function redirectLogin(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/login', request.url));
  // Garante que o cookie seja removido em qualquer cenário (logout, token expirado, etc.)
  response.cookies.set('rekly_token', '', { maxAge: 0, path: '/' });
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const ehPublica = ROTAS_PUBLICAS.some(
    (rota) => pathname === rota || pathname.startsWith('/api/auth')
  );

  const token = request.cookies.get('rekly_token')?.value;

  // Rota protegida sem token -> redireciona e limpa cookie
  if (!ehPublica && !token) {
    return redirectLogin(request);
  }

  // Tem token -> valida
  if (token) {
    try {
      await jwtVerify(token, JWT_SECRET);
      // Usuário logado tentando acessar página pública -> redireciona para dashboard
      if (ehPublica && pathname !== '/' && !pathname.startsWith('/api')) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    } catch {
      // Token inválido ou expirado -> limpa cookie e redireciona para login
      return redirectLogin(request);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public/).*)'],
};