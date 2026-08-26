# Decisões de integração de calendários

A documentação oficial do Google Calendar indica que a criação de eventos exige OAuth com o escopo `https://www.googleapis.com/auth/calendar`, permissão de escrita no calendário e eventos temporizados com `start.dateTime` e `end.dateTime`. A primeira integração deve, portanto, usar OAuth do Google e validar o `accessRole` do calendário antes de criar ou atualizar eventos.

A documentação oficial do iPhone confirma que o sistema permite adicionar um calendário por assinatura de URL. O Organiza AI poderá oferecer um calendário ICS publicado por usuário como compatibilidade com Apple Calendar no iPhone. Essa assinatura é adequada para leitura/sincronização de eventos do Organiza AI no aparelho, enquanto a escrita bidirecional ficará concentrada inicialmente no Google Calendar.

Fontes consultadas:

- Google Calendar — Create events: https://developers.google.com/workspace/calendar/api/guides/create-events
- Apple Support — Set up multiple calendars on iPhone: https://support.apple.com/guide/iphone/use-multiple-calendars-iph3d1110d4/ios

## Estado da configuração em 25/08/2026

A conta Google autenticada é Gabrielly Silva (8gabrielly@gmail.com). O projeto selecionado no Console é “My First Project”, com ID `prime-granite-466217-r0`. A Google Calendar API foi acionada para ativação; o Console exibiu uma tarefa em andamento após o clique, portanto é necessário aguardar a confirmação antes de criar credenciais OAuth.

## Progresso adicional

A Google Calendar API está ativada no projeto `prime-granite-466217-r0`. O assistente de credenciais foi aberto com “Dados do usuário”; o nome do app foi preenchido como “Organiza AI” e o e-mail de suporte/contato selecionado foi `8gabrielly@gmail.com`. A sessão do navegador ficou em branco ao avançar, então a configuração OAuth precisa ser retomada no Console, provavelmente pela seção de Credenciais ou Tela de permissão OAuth.
