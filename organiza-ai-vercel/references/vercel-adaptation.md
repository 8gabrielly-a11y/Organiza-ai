# Adaptação do Organiza AI para Vercel

## Fontes consultadas

- https://vercel.com/docs/frameworks/backend/express — A documentação atual informa que uma aplicação Express pode ser detectada e executada como uma única Vercel Function quando existe um entrypoint compatível, como `server.ts`, com export default da aplicação ou listener.
- https://vercel.com/docs/functions/runtimes/node-js — O runtime Node.js aceita servidores HTTP/TypeScript e procura entrypoints `server.*` no projeto ou em `src/`.
- https://vercel.com/docs/frameworks/frontend/vite — O Vite pode ser servido como SPA estática; para backend, a documentação recomenda Vercel Functions ou Nitro. Deep links de SPA exigem rewrite para `index.html` quando aplicável.

## Decisão técnica

O projeto atual usa Express, tRPC e Vite no mesmo processo. A adaptação precisa manter o servidor Express como uma função Node.js e servir os assets do Vite separadamente, com um `vercel.json` que encaminhe `/api/*` para a função e as demais rotas para o frontend. O diretório raiz do Vercel deve ser `organiza-ai`, porque o repositório GitHub contém o projeto dentro dessa subpasta.

O deploy externo também exige que as variáveis de ambiente do projeto sejam cadastradas no Vercel. Arquivos `.env` não devem ser enviados ao repositório.
