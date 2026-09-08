# Syncora — notificações com o app fechado

## O que foi adicionado

1. `PushSubscription` — guarda uma assinatura Web Push por dispositivo.
2. `getPushPublicKey` — entrega ao navegador somente a chave VAPID pública.
3. `registerPushSubscription` / `unregisterPushSubscription` — cadastram e desativam dispositivos autenticados.
4. `public/sw.js` — Service Worker que recebe o push mesmo com a aba fechada e abre o Syncora ao tocar.
5. `runAssistantAutomationCron` — execução central, sem usuário logado, protegida por segredo; usa `asServiceRole`, verifica cada usuário, replaneja e envia Web Push.
6. `cloudflare-push-cron` — Worker gratuito que chama a função Base44 a cada minuto.

## 1. Gerar VAPID

Em um terminal com Node instalado:

```bash
npx web-push generate-vapid-keys
```

Guarde a chave privada. A pública pode ser exposta ao navegador.

## 2. Secrets da Base44

Configure no projeto Base44:

```text
VAPID_PUBLIC_KEY=<public key>
VAPID_PRIVATE_KEY=<private key>
VAPID_SUBJECT=mailto:<seu-email>
CRON_SHARED_SECRET=<segredo longo aleatório>
```

Não coloque `VAPID_PRIVATE_KEY` no frontend.

## 3. Service Worker

No projeto real, `public/sw.js.txt` corresponde a `public/sw.js`. O arquivo precisa ser publicado na raiz do site como `/sw.js`.

## 4. Deploy das funções/entidades Base44

Publicar:

- entity `PushSubscription`
- entity `AssistantReminder` atualizada
- function `getPushPublicKey`
- function `registerPushSubscription`
- function `unregisterPushSubscription`
- function `runAssistantAutomationCron`

## 5. Cloudflare Worker

Dentro de `cloudflare-push-cron`:

```bash
npm install -g wrangler
wrangler login
wrangler secret put BASE44_CRON_URL
wrangler secret put CRON_SHARED_SECRET
wrangler secret put MANUAL_RUN_SECRET
wrangler deploy
```

`BASE44_CRON_URL` deve ser a URL pública da função Base44:

```text
https://SEU-DOMINIO/functions/runAssistantAutomationCron
```

O `CRON_SHARED_SECRET` deve ser EXATAMENTE igual ao configurado na Base44.

O `wrangler.toml` já contém:

```text
* * * * *
```

portanto o Worker chama o Syncora a cada minuto.

## 6. No celular/computador

Entrar no Syncora -> Configurações -> Notificações -> ativar.

O navegador pedirá permissão e registra aquele dispositivo. Cada dispositivo precisa autorizar uma vez.

## Comportamento depois disso

O app pode estar fechado. Cloudflare executa a checagem; Base44 identifica o que precisa de atenção; Web Push entrega a notificação; o Service Worker a mostra. Ao tocar, o Syncora abre.

## iPhone/iPad

Web Push depende do suporte do navegador/SO. Para melhor confiabilidade em iOS/iPadOS, use o Syncora instalado na Tela de Início como web app/PWA e permita notificações quando solicitado.

## Segurança

- a chave VAPID privada fica apenas em Secrets da Base44;
- o Worker Cloudflare não recebe a VAPID privada;
- a função cron exige `x-syncora-cron-secret`;
- cada assinatura push é associada ao usuário autenticado;
- endpoints expirados (404/410) são desativados automaticamente.
