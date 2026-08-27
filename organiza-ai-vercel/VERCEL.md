# Deploy do Organiza AI no Vercel

## Configuração do projeto

Ao importar o repositório no Vercel, defina **Root Directory** como `organiza-ai-vercel`, pois esse é o nome da pasta que contém o projeto no repositório GitHub atual. Se você mover os arquivos do projeto para a raiz do repositório, use `.` em vez disso. O projeto já contém `vercel.json`, portanto o build usa `pnpm build` e publica `dist/public` como frontend estático. As requisições para `/api/*` são atendidas pela função Node.js em `api/[...path].ts`, que encaminha as rotas ao Express e ao tRPC. O fallback da SPA exclui explicitamente `/api/*`; sem essa exclusão, o login recebe `index.html` em vez de JSON. A versão nativa do Node.js é definida por `engines.node` no `package.json`; não é necessário declarar `functions.*.runtime` no `vercel.json`.

Não selecione um template de site estático que substitua a configuração existente. O sintoma de o código-fonte aparecer como texto geralmente indica que o diretório raiz ou o output do build foi configurado para a pasta errada. Se surgir o erro `Function Runtimes must have a valid version`, remova qualquer `runtime` manual do `vercel.json`; runtimes externos usam outro formato, enquanto Node.js é nativo e sua versão é controlada pelo projeto.

## Variáveis de ambiente

Cadastre as variáveis abaixo no painel do Vercel para **Preview** e **Production**. Os valores devem ser os mesmos do ambiente correspondente; nunca faça commit de `.env` ou de chaves no GitHub.

| Variável | Obrigatória | Uso |
|---|---:|---|
| `DATABASE_URL` | Sim | Conexão MySQL/TiDB usada pelo Drizzle ORM. |
| `JWT_SECRET` | Sim | Assinatura e proteção da sessão. Use um segredo longo e aleatório. |
| `VITE_APP_ID` | Sim | Identificador do aplicativo OAuth Manus. |
| `OAUTH_SERVER_URL` | Sim | Base do servidor OAuth Manus. |
| `VITE_OAUTH_PORTAL_URL` | Sim | URL do portal OAuth usada no frontend. |
| `GOOGLE_CLIENT_ID` | Para Google Calendar | Client ID OAuth do Google. |
| `GOOGLE_CLIENT_SECRET` | Para Google Calendar | Client secret OAuth do Google. |
| `GOOGLE_REDIRECT_URI` | Para Google Calendar | Callback HTTPS do projeto publicado, compatível com a configuração do Google. |
| `BUILT_IN_FORGE_API_URL` | Sim | Endpoint dos serviços internos de IA e storage. |
| `BUILT_IN_FORGE_API_KEY` | Sim | Chave server-side dos serviços internos. |
| `VITE_FRONTEND_FORGE_API_URL` | Sim | Endpoint dos serviços internos acessados pelo frontend. |
| `VITE_FRONTEND_FORGE_API_KEY` | Sim | Chave pública/limitada destinada ao frontend. |
| `OWNER_OPEN_ID` | Sim | Identidade do proprietário usada por recursos internos. |
| `OWNER_NAME` | Recomendável | Nome do proprietário para recursos internos. |
| `RESEND_API_KEY` | Para recuperação por e-mail | Chave do Resend; o envio amplo requer domínio verificado. |
| `RESEND_TEST_RECIPIENT` | Para modo de teste do Resend | Destinatário permitido no modo de teste. |

O `VITE_` no nome significa que o valor pode ser incorporado no bundle do navegador. Portanto, **segredos privados nunca devem receber prefixo `VITE_`**.

## Callbacks

Depois de conhecer o domínio gerado pelo Vercel, atualize `GOOGLE_REDIRECT_URI` para o callback HTTPS esperado pelo projeto e inclua essa mesma URL nas credenciais OAuth do Google. Se o domínio mudar, atualize os dois lados novamente.

## Validação do bundle e após o primeiro deploy

O backend deve usar imports relativos nos módulos carregados pela função. Aliases como `@shared/*` podem ser aceitos pelo TypeScript local, mas não devem permanecer no bundle de runtime do backend. Antes do push, valide `pnpm exec tsc --noEmit`, `pnpm test` e `pnpm build`. O carregamento do bundle Node também deve ser testado; a função precisa exportar uma aplicação Express válida.

Use `/api/health` para confirmar que a função serverless está respondendo. Depois valide login, carregamento da Home, envio de uma mensagem, criação de item na Agenda, exportação ICS e logout. Verifique os logs da função caso `/api/health` funcione, mas uma rota tRPC específica falhe.
