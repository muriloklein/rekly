/**
 * Agenda o processamento de notificações por e-mail diariamente às 08:00.
 *
 * Uso: npx ts-node --esm scripts/cron-notificacoes.ts
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const APP_URL = process.env.APP_URL ?? 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET ?? '';

const HORA_EXECUCAO = 8;
const MINUTO_EXECUCAO = 0;

async function dispararNotificacoes(): Promise<void> {
  const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  console.log(`[cron] Disparando notificacoes as ${agora}...`);

  try {
    const res = await fetch(`${APP_URL}/api/notifications/trigger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(CRON_SECRET ? { Authorization: `Bearer ${CRON_SECRET}` } : {}),
      },
    });

    const data = await res.json() as { enviados: number; erros: number };

    if (!res.ok) {
      console.error('[cron] Erro da API:', data);
      return;
    }

    console.log(`[cron] Concluido - enviados: ${data.enviados}, erros: ${data.erros}`);
  } catch (err) {
    console.error('[cron] Falha na requisicao:', err);
  }
}

function agendarProximaExecucao(): void {
  const agora = new Date();
  const proxima = new Date(agora);
  proxima.setHours(HORA_EXECUCAO, MINUTO_EXECUCAO, 0, 0);

  if (proxima <= agora) {
    proxima.setDate(proxima.getDate() + 1);
  }

  const ms = proxima.getTime() - agora.getTime();
  const horas = Math.floor(ms / 3600000);
  const minutos = Math.floor((ms % 3600000) / 60000);

  console.log(`[cron] Proxima execucao em ${horas}h ${minutos}min`);

  setTimeout(async () => {
    await dispararNotificacoes();
    setInterval(dispararNotificacoes, 24 * 60 * 60 * 1000);
  }, ms);
}

console.log('[cron] Servico de notificacoes iniciado.');
agendarProximaExecucao();
