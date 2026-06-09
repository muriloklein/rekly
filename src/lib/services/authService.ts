import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import * as usuarioRepo from '../repositories/usuarioRepository';
import { prisma } from '../prisma';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'fallback_dev_secret_troque_em_producao'
);
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN ?? '30m';

const MAX_TENTATIVAS = 5;
const BLOQUEIO_MINUTOS = 15;
const JANELA_MINUTOS = 15; // janela de contagem de tentativas

async function contarTentativasFalha(email: string): Promise<number> {
  const desde = new Date(Date.now() - JANELA_MINUTOS * 60 * 1000);
  return prisma.log.count({
    where: {
      acao: 'LOGIN_FALHA',
      tabela_afetada: email,
      criado_em: { gte: desde },
    },
  });
}

async function registrarTentativaFalha(email: string): Promise<void> {
  await prisma.log.create({
    data: {
      usuario_id: null,
      acao: 'LOGIN_FALHA',
      tabela_afetada: email,
      registro_id: null,
    },
  });
}

async function limparTentativasFalha(email: string): Promise<void> {
  await prisma.log.deleteMany({
    where: { acao: 'LOGIN_FALHA', tabela_afetada: email },
  });
}

async function estaBloqueado(email: string): Promise<boolean> {
  const tentativas = await contarTentativasFalha(email);
  return tentativas >= MAX_TENTATIVAS;
}

// Gera token JWT
export async function gerarToken(usuarioId: number, email: string): Promise<string> {
  return new SignJWT({ sub: String(usuarioId), email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES)
    .sign(JWT_SECRET);
}

// Verificar token JWT
export async function verificarToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
}

// Cadastrar usuário
export async function cadastrar(nome: string, email: string, senha: string, confirmarSenha: string) {
  if (!nome?.trim() || !email?.trim() || !senha || !confirmarSenha) {
    return { erro: 'Todos os campos são obrigatórios.' };
  }

  if (senha !== confirmarSenha) {
    return { erro: 'As senhas não conferem.' };
  }

  if (senha.length < 8) {
    return { erro: 'A senha deve ter no mínimo 8 caracteres.' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { erro: 'E-mail inválido.' };
  }

  const existe = await usuarioRepo.findByEmail(email);
  if (existe) {
    return { erro: 'Este e-mail já está cadastrado.' };
  }

  const senhaHash = await bcrypt.hash(senha, 12);
  const usuario = await usuarioRepo.createUsuario({ nome, email, senhaHash });
  const token = await gerarToken(usuario.id, usuario.email);

  return { usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email }, token };
}

// Login
export async function login(email: string, senha: string) {
  if (!email?.trim() || !senha) {
    return { erro: 'E-mail e senha são obrigatórios.' };
  }

  if (await estaBloqueado(email)) {
    return { erro: `Conta temporariamente bloqueada por tentativas inválidas. Tente novamente em ${BLOQUEIO_MINUTOS} minutos.`,};
  }

  const usuario = await usuarioRepo.findByEmail(email);

  if (!usuario) {
    await registrarTentativaFalha(email);
    return { erro: 'Credenciais inválidas.' };
  }

  const senhaValida = await bcrypt.compare(senha, usuario.senha);
  if (!senhaValida) {
    await registrarTentativaFalha(email);
    const tentativas = await contarTentativasFalha(email);
    const restam = MAX_TENTATIVAS - tentativas;
    if (restam <= 0) {
      return { erro: `Conta bloqueada por ${BLOQUEIO_MINUTOS} minutos após múltiplas tentativas inválidas.` };
    }
    return { erro: `Credenciais inválidas. ${restam} tentativa(s) restante(s).` };
  }

  await limparTentativasFalha(email);
  await usuarioRepo.registrarLog(usuario.id, 'LOGIN', 'usuarios', usuario.id);

  const token = await gerarToken(usuario.id, usuario.email);
  return { usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email }, token };
}

const resetTokens = new Map<string, { usuarioId: number; expira: Date }>();

// Solicitar recuperação de senha
export async function solicitarRecuperacao(email: string) {
  const usuario = await usuarioRepo.findByEmail(email);

  // Sempre retorna sucesso para não vazar se e-mail existe (segurança)
  if (!usuario) {
    return { ok: true };
  }

  const token = crypto.randomUUID();
  resetTokens.set(token, {
    usuarioId: usuario.id,
    expira: new Date(Date.now() + 30 * 60 * 1000), // 30 minutos
  });

  return { ok: true, resetToken: token, nomeUsuario: usuario.nome, emailUsuario: usuario.email };
}

// Redefinir senha
export async function redefinirSenha(token: string, novaSenha: string, confirmarSenha: string) {
  if (!token) return { erro: 'Token inválido.' };

  const dados = resetTokens.get(token);
  if (!dados) return { erro: 'Link de recuperação inválido ou já utilizado.' };

  if (new Date() > dados.expira) {
    resetTokens.delete(token);
    return { erro: 'Link de recuperação expirado. Solicite um novo.' };
  }

  if (novaSenha !== confirmarSenha) return { erro: 'As senhas não conferem.' };
  if (novaSenha.length < 8) return { erro: 'A senha deve ter no mínimo 8 caracteres.' };

  const senhaHash = await bcrypt.hash(novaSenha, 12);
  await usuarioRepo.updateSenha(dados.usuarioId, senhaHash);

  resetTokens.delete(token); // Invalidar token após uso
  await usuarioRepo.registrarLog(dados.usuarioId, 'RESET_SENHA', 'usuarios', dados.usuarioId);

  return { ok: true };
}

// Obter usuário atual pelo token do cookie
export async function getUsuarioDoToken(token: string) {
  const payload = await verificarToken(token);
  if (!payload?.sub) return null;
  return usuarioRepo.findById(Number(payload.sub));
}
