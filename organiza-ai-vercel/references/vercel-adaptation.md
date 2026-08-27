# Adaptação do Organiza AI para Vercel

## Fontes consultadas

- https://vercel.com/docs/frameworks/backend/express — A documentação atual informa que uma aplicação Express pode ser detectada e executada como uma única Vercel Function quando existe um entrypoint compatível, como `server.ts`, com export default da aplicação ou listener.
- https://vercel.com/docs/functions/runtimes/node-js — O runtime Node.js aceita servidores HTTP/TypeScript e procura entrypoints `server.*` no projeto ou em `src/`.
- https://vercel.com/docs/frameworks/frontend/vite — O Vite pode ser servido como SPA estática; para backend, a documentação recomenda Vercel Functions ou Nitro. Deep links de SPA exigem rewrite para `index.html` quando aplicável.

## Decisão técnica

O projeto atual usa Express, tRPC e Vite no mesmo processo. A adaptação precisa manter o servidor Express como uma função Node.js e servir os assets do Vite separadamente, com um `vercel.json` que encaminhe `/api/*` para a função e as demais rotas para o frontend. O diretório raiz do Vercel deve ser `organiza-ai`, porque o repositório GitHub contém o projeto dentro dessa subpasta.

O deploy externo também exige que as variáveis de ambiente do projeto sejam cadastradas no Vercel. Arquivos `.env` não devem ser enviados ao repositório.

## Diagnóstico do erro de runtime

O Vercel rejeitou o `vercel.json` com `Function Runtimes must have a valid version` porque `functions.*.runtime` é destinado a runtimes externos versionados, enquanto Node.js é o runtime nativo da plataforma. A versão do Node.js deve ser escolhida nas configurações do projeto ou sobrescrita por `engines.node` no `package.json`, por exemplo `"node": "22.x"`.

Fontes adicionais consultadas:

- https://vercel.com/docs/functions/runtimes/node-js/node-js-versions — versões disponíveis e configuração por `engines.node`.
- https://vercel.com/docs/project-configuration/vercel-json — `functions` e configuração de funções no `vercel.json`.

Correção prevista: remover o bloco `functions` com `runtime` do `vercel.json` e declarar `engines.node` no `package.json`, mantendo a função catch-all detectada automaticamente pelo Vercel.

## Relação com o erro de cadastro

A documentação oficial atual do Vercel confirma que Express pode ser implantado com detecção automática do entrypoint, e que a seleção da versão Node.js é separada da configuração de runtimes externos. O deployment do screenshot usava o commit `9412609`, cujo `vercel.json` ainda continha `runtime: "nodejs22.x"`; o commit seguinte `b3d4ac4` já removeu esse campo. Isso indica que o screenshot foi capturado em uma versão intermediária/antiga do repositório. O fluxo local do mesmo código respondeu `200` com `{ success: true }` para `auth.register`; a próxima validação deve ocorrer após redeploy do commit corrigido e com as variáveis `DATABASE_URL` e `JWT_SECRET` configuradas.

## Evidência adicional do domínio público — 27/08/2026

O domínio `https://organiza-ai-eta.vercel.app` respondeu `200` para `/api/health`, mas com `content-type: text/html` e o conteúdo de `index.html`. As chamadas POST para `/api/trpc/auth.login?batch=1` e `/api/trpc/auth.register?batch=1` responderam `405` com corpo vazio. Isso confirmou que o rewrite global da SPA (`/(.*) -> /index.html`) estava capturando `/api/*` antes da função serverless.

A configuração corrigida usa o padrão `/((?!api(?:/|$)).*) -> /index.html`, excluindo as rotas da API do fallback da SPA. TypeScript, 73 testes Vitest e build local passaram após a alteração. A validação pública final depende do novo commit ser enviado ao GitHub e implantado no Vercel.

Referências oficiais consultadas:

- https://vercel.com/docs/deployment-protection — Deployment Protection on Vercel; Standard Protection pode proteger URLs de preview.
- https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/deployment-protection-exceptions — Deployment Protection Exceptions; exceções de domínio podem tornar previews públicos, sujeitas à disponibilidade do plano.
- https://vercel.com/docs/project-configuration/vercel-json — referência de configuração do `vercel.json`.
