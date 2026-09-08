# Syncora

Assistente pessoal inteligente em React/Vite, com Base44 no backend, Gemini para interpretação de linguagem natural e infraestrutura de Web Push preparada para Cloudflare Cron.

## O que já existe

- autenticação e onboarding;
- grupos e subgrupos;
- chat geral e por grupo;
- tarefas, compromissos, rotinas e prazos;
- planejamento por intervalos e duração;
- replanejamento e estados de acompanhamento;
- entrada por voz;
- integração inicial com Google Calendar;
- Web Push + Service Worker;
- função automática de acompanhamento;
- Worker/Cron da Cloudflare em `cloudflare-push-cron/`.

## Desenvolvimento local

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Publicação

O frontend pode ser conectado ao GitHub e publicado pela Vercel.  
As funções em `base44/` continuam pertencendo ao backend Base44.  
O agendador para notificações com o app fechado está em `cloudflare-push-cron/`.

Veja `docs/PUSH_APP_FECHADO_SETUP.md` para os segredos e configuração do Web Push.

## Segurança

Nunca envie para o GitHub:

- chave privada VAPID;
- `CRON_SHARED_SECRET`;
- tokens de usuário;
- chaves Gemini pessoais.

Use variáveis/segredos das plataformas.
