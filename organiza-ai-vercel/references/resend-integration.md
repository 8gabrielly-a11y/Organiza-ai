# Resend — referências para recuperação por e-mail

Fontes oficiais consultadas em 26/08/2026:

- https://resend.com/docs/api-reference/emails/send-email — envio via `POST https://api.resend.com/emails`, autenticação Bearer, campos obrigatórios `from`, `to` e `subject`, e conteúdo `html` ou `text`; o cabeçalho `Idempotency-Key` pode evitar duplicação.
- https://resend.com/docs/create-an-api-key — a credencial deve ser armazenada como `RESEND_API_KEY`; a chave deve ter permissão de envio e só é exibida uma vez.
- https://resend.com/docs/dashboard/domains/introduction — é necessário ter ao menos um domínio próprio verificado para enviar e-mails; recomenda-se usar subdomínio para separar a reputação de envio transacional.

Decisão provisória: usar Resend como provedor transacional, condicionado ao fornecimento de `RESEND_API_KEY`, `RESEND_FROM_EMAIL` com domínio verificado e `APP_BASE_URL` para montar o link de redefinição.
