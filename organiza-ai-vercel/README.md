# Organiza AI

Aplicativo multiusuário para registrar tarefas, compromissos e rotinas por texto ou áudio. A interface usa React/Vite; a API usa Express/tRPC; os dados ficam em MySQL com Drizzle ORM.

## Publicação rápida na Vercel

### 1. Prepare o banco MySQL

Crie um banco MySQL acessível pela internet e copie a URL de conexão. Depois, no computador, crie `.env` a partir de `.env.example`, preencha `DATABASE_URL` e execute:

```bash
pnpm install
pnpm db:push
```

As 20 migrações incluídas no projeto criarão as tabelas necessárias.

### 2. Envie o projeto ao GitHub

Envie **o conteúdo desta pasta como raiz do repositório**. `package.json`, `vercel.json`, `api/`, `client/` e `server/` precisam aparecer na primeira página do repositório.

### 3. Importe o repositório na Vercel

Use estas configurações:

- Framework Preset: `Vite`
- Root Directory: deixe vazio se esta pasta for a raiz do GitHub
- Build Command: `pnpm build`
- Output Directory: `dist/public`
- Install Command: `pnpm install`
- Node.js: `22.x`

O `vercel.json` já preserva `/api/*` para a função serverless e envia as outras rotas para a SPA.

### 4. Cadastre as variáveis obrigatórias

Em **Vercel → Project Settings → Environment Variables**, adicione:

| Variável | Valor |
| --- | --- |
| `DATABASE_URL` | URL completa do banco MySQL |
| `JWT_SECRET` | segredo aleatório com pelo menos 32 caracteres |
| `VITE_APP_ID` | `organiza-ai` |
| `APP_BASE_URL` | domínio final, por exemplo `https://seu-projeto.vercel.app` |
| `TZ` | `America/Sao_Paulo` |
| `CRON_SECRET` | outro segredo aleatório, usado pela Vercel para proteger o processamento dos lembretes |

Para gerar um `JWT_SECRET` localmente:

```bash
openssl rand -base64 48
```

Nunca coloque essas informações no GitHub.

### 5. Crie o primeiro deploy

Depois do deploy, confira primeiro:

```text
https://SEU-DOMINIO/api/health
```

A resposta esperada é:

```json
{"ok":true,"service":"organiza-ai"}
```

Em seguida, teste criação de conta, login, criação de tarefa e abertura da Agenda.

## Recursos opcionais

### Gemini

A chave do Gemini é cadastrada pelo próprio usuário em **Configurações**. Ela não precisa ser colocada nas variáveis da Vercel.

### Google Calendar

Cadastre `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e:

```text
GOOGLE_REDIRECT_URI=https://SEU-DOMINIO/api/calendar/google/callback
```

Essa mesma URL deve ser autorizada no projeto do Google.

### E-mail e recuperação de senha

Cadastre:

```text
RESEND_API_KEY=re_...
EMAIL_FROM=Organiza AI <lembretes@seudominio.com>
```

O domínio usado em `EMAIL_FROM` precisa estar autorizado no Resend. Depois disso, o usuário pode selecionar **E-mail** ou **E-mail + push** nas Configurações.

### Notificações push

Gere as chaves uma única vez:

```bash
pnpm exec web-push generate-vapid-keys
```

Cadastre o resultado na Vercel:

```text
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:seu-email@exemplo.com
```

O usuário deverá abrir **Configurações → Lembretes e notificações** e clicar em **Ativar notificações neste dispositivo**. Cada navegador ou celular precisa ser autorizado separadamente. No iPhone, notificações web exigem que o site seja adicionado à Tela de Início.

### Execução automática dos lembretes

O `vercel.json` agenda `/api/scheduled/reminders` a cada 15 minutos. A Vercel envia `CRON_SECRET` no cabeçalho de autorização e o servidor verifica esse segredo antes de processar os usuários. O plano da conta Vercel precisa aceitar essa frequência; se não aceitar, use um serviço de cron externo chamando a mesma rota com `Authorization: Bearer SEU_CRON_SECRET`.

### Áudio e lembretes automáticos

Transcrição de áudio e armazenamento externo ainda usam o serviço herdado indicado por `BUILT_IN_FORGE_API_URL` e `BUILT_IN_FORGE_API_KEY`. Os lembretes por e-mail e push não dependem mais dele.

## Validação antes de publicar

```bash
pnpm install
pnpm validate:deploy
```

O comando verifica TypeScript, executa os testes e gera o build de produção.

## Estrutura principal

```text
api/       função serverless da Vercel
client/    interface React
server/    API, autenticação e integrações
shared/    tipos e regras compartilhadas
drizzle/   schema e migrações MySQL
```
