# Recuperação de acesso

O Organiza AI usa e-mail e senha para autenticação local. A recuperação de acesso ficará desacoplada das notificações do produto e deverá usar um provedor transacional de e-mail quando essa etapa for habilitada.

O contrato previsto é `auth.requestPasswordReset({ email })`, que sempre retorna uma resposta neutra para não revelar se o e-mail está cadastrado. Para uma conta existente, o servidor criará um token aleatório de uso único, armazenará somente o hash do token com expiração curta e enviará um link HTTPS para uma rota pública de redefinição. O endpoint `auth.resetPassword({ token, password })` validará expiração, consumo único, força mínima da nova senha e invalidará sessões existentes antes de substituir o hash.

Nenhum token, senha ou chave de integração deve ser registrado em logs. A implementação deve exigir HTTPS em produção, limitar tentativas por IP e conta e manter o e-mail separado da rotina de lembretes conversacionais.
