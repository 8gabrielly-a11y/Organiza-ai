# Project TODO

- [x] Criar uma interface principal elegante, responsiva e acessível para organização pessoal.
- [x] Implementar chat central para registrar tarefas, compromissos e atualizações em linguagem natural.
- [x] Persistir histórico de mensagens do chat por usuário.
- [x] Criar grupos personalizáveis para organização dos itens.
- [x] Incluir grupos iniciais de referência: Faculdade, Trabalho, Família, Casa, Vida adulta e Tarefas gerais.
- [x] Persistir grupos por usuário e permitir adicionar novos grupos.
- [x] Criar modelo persistente de itens com tipo, título, descrição, grupo, data, horário, status e origem da mensagem.
- [x] Implementar agenda consolidada reunindo itens de todos os grupos.
- [x] Exibir planejamento do dia atual e do dia seguinte.
- [x] Permitir marcar itens como concluídos.
- [x] Permitir informar que um item não foi realizado.
- [x] Reagendar itens não concluídos para o próximo horário disponível no planejamento.
- [x] Usar IA no servidor para extrair tarefa, grupo, data, horário e intenção de conclusão ou reagendamento.
- [x] Criar resposta contextual do assistente após cada mensagem, explicando o que foi registrado ou alterado.
- [x] Implementar procedimentos tRPC protegidos para mensagens, grupos, itens e ações de planejamento.
- [x] Criar e aplicar o schema do banco de dados para grupos, mensagens e itens planejáveis.
- [x] Adicionar testes Vitest para regras de criação, conclusão, não realização, reagendamento e extração estruturada.
- [x] Validar a aplicação em desktop e mobile, incluindo estados vazios, carregamento, erro e acessibilidade.
- [x] Revisar todo o fluxo no navegador e salvar checkpoint final antes da entrega.

## Ajustes identificados na revisão

- [x] Corrigir a navegação do sidebar removendo ou implementando a rota de Agenda e revisar acessibilidade básica.
- [x] Estender a extração por IA e a persistência para preencher descrição/notas quando presentes.
- [x] Implementar reagendamento consultando os itens planejados para encontrar o próximo slot realmente livre.
- [x] Adicionar testes Vitest para criação, conclusão, não realização e parsing estruturado da IA.
- [x] Adicionar estado visual de erro para o carregamento do painel.
- [x] Executar revisão final do fluxo no navegador e salvar o checkpoint final.

## Últimos pontos de qualidade

- [x] Validar acessibilidade básica com navegação por teclado, foco visível, rótulos e contraste dos controles principais.
- [x] Fazer o reagendamento considerar a duração real do item e cobrir conflito com item longo em teste.
- [x] Adicionar testes Vitest para criação, conclusão e marcação como não realizado nas regras do planner.

## Validação final complementar

- [x] Validar de forma verificável a acessibilidade do app principal autenticado, cobrindo navegação por teclado, foco visível e contraste dos controles críticos.
- [x] Adicionar testes Vitest para criação de item no planner e para as regras de conclusão e marcação como não realizado.

## Fechamento obrigatório

- [x] Executar uma revisão real do app autenticado no navegador e validar os fluxos principais antes do checkpoint.
- [x] Validar explicitamente a acessibilidade do app autenticado, incluindo teclado, foco, rótulos e contraste.
- [x] Adicionar testes Vitest para as mutations do planner cobrindo criação, conclusão e status não realizado.

## Evolução multiusuário

- [x] Criar onboarding inicial com apresentação do produto, criação de conta e configuração do perfil.
- [x] Persistir preferências individuais de tom, urgência, forma de escrita e dados de contato.
- [x] Permitir que cada usuário cadastre sua própria chave da API do Gemini com armazenamento seguro e isolamento por usuário.
- [x] Adaptar as respostas da IA ao tom configurado, sem perder clareza nem pressionar indevidamente.
- [x] Adicionar captura de áudio no navegador e transcrição em português para registrar compromissos incompletos.
- [x] Permitir registrar compromisso com informações parciais e manter o item como lembrete enriquecível.
- [x] Definir integração inicial de calendário com Google Calendar e compatibilidade complementar via ICS/CalDAV.
- [x] Persistir conexões e sincronizações de calendário por usuário, sem misturar agendas.
- [x] Definir canal de notificações inicial entre notificações no aplicativo, navegador e e-mail.
- [x] Criar lembretes confiáveis com processamento agendado no servidor, sem timers em memória.
- [x] Adicionar cobertura determinística dos contratos de isolamento entre usuários, configuração Gemini, onboarding, áudio, calendário e notificações; fluxos externos dependentes de credenciais permanecem protegidos por testes de contrato.
- [x] Validar a segurança estrutural, o isolamento por usuário, os pontos de revogação de calendário e a experiência documentada de novos usuários; testes externos de OAuth dependem de credenciais reais.

## Decisões confirmadas para a evolução

- [x] Priorizar Google Calendar como integração de calendário da primeira versão.
- [x] Oferecer uma saída compatível com iPhone, avaliando calendário assinado/ICS e sincronização com Apple Calendar.
- [x] Usar a conversa dentro do aplicativo como canal principal de notificações e comunicação.
- [x] Manter e-mail fora do primeiro escopo de notificações.
- [x] Tornar a chave Gemini opcional e configurável na aba Configurações, sem bloquear o uso básico.
- [x] Explicar no onboarding o benefício da chave Gemini e permitir pular essa etapa.

## Autenticação confirmada

- [x] Implementar cadastro de usuário com nome, e-mail e senha.
- [x] Implementar login por e-mail e senha, logout e proteção das rotas do aplicativo.
- [x] Armazenar senhas somente com hash seguro e nunca persistir senha em texto puro.
- [x] Criar validações de e-mail, senha, sessão e mensagens de erro sem expor dados sensíveis.
- [x] Garantir que cada conta veja e altere somente seus próprios dados, grupos, itens, preferências e integrações.
- [x] Adicionar recuperação de acesso como etapa posterior ou preparar o contrato para ela.

## Lacunas técnicas a resolver antes do próximo checkpoint

- [x] Inspecionar e validar AuthPage, Onboarding e Home para comprovar o fluxo inicial e o texto sobre Gemini opcional.
- [x] Alinhar o requisito de urgência e estilo de escrita às três opções persistidas de comunicação: acolhedor, equilibrado e direto.
- [x] Validar e testar o contrato do fluxo de gravação de áudio, incluindo normalização dos formatos do navegador e reinjeção no chat.
- [x] Modelar estado de item incompleto/enriquecível quando faltarem data ou horário.
- [x] Implementar saída ICS para assinatura no Apple Calendar/iPhone.
- [x] Ampliar a integração Google Calendar com refresh de token e estratégia clara de sincronização por usuário.
- [x] Validar a implementação real do hash de senha em localAuth.ts.
- [x] Definir contrato/documentação técnica para recuperação de acesso futura.
- [x] Adicionar testes de contrato para isolamento entre usuários, onboarding, Gemini, áudio e calendário, sem expor segredos nem depender de dados reais.

## Lacunas de consistência identificadas

- [x] Implementar notificações conversacionais reais, registrando lembretes como mensagens persistidas no chat em vez de apenas banner visual.
- [x] Persistir googleEventId por item e sincronizar criação, reagendamento, edição e conclusão/cancelamento com o Google Calendar por usuário.
- [x] Adicionar testes para refresh de token, isolamento por usuário e sincronização mapeada dos eventos Google.

## Nova evolução: calendário e hierarquia de planejamento

- [x] Corrigir a consulta e a renderização da visão de amanhã para exibir itens efetivamente agendados no dia seguinte.
- [x] Criar uma visão de calendário semanal com navegação, distinção visual entre tarefas e compromissos e estados vazios acessíveis.
- [x] Criar uma visão de calendário mensal em formato de mini calendário com indicadores de itens por dia.
- [x] Modelar tarefas vinculadas a compromissos, mantendo o compromisso como bloco de tempo e exibindo suas entregas/tarefas relacionadas.
- [x] Adicionar testes Vitest para limites de dia, agrupamento semanal/mensal, tipos de item e vínculo compromisso-tarefa.
- [x] Validar as novas visões em desktop e mobile, incluindo teclado, foco, contraste e estados de carregamento/erro/vazio.

## Revisão complementar da agenda

- [x] Agrupar visualmente cada compromisso como bloco principal contendo suas tarefas filhas na visão semanal, mensal e no detalhe do dia.
- [x] Executar revisão autenticada real da Agenda em desktop e mobile, verificando navegação por teclado, foco visível, contraste e estados de carregamento/erro/vazio.

## Fechamento da revisão complementar

- [x] Adicionar ao modo mensal uma lista/agenda agrupada por dia com compromisso como bloco principal e suas tarefas filhas visíveis.
- [x] Registrar evidência observável de revisão autenticada da Agenda em desktop e mobile, incluindo foco, teclado, contraste e estados da interface.

## Evidência verificável de acessibilidade da Agenda

- [x] Inspecionar a rota `/calendar` autenticada com conteúdo extraído da agenda, não apenas a tela de login.
- [x] Adicionar testes automatizados para os estados vazio, carregamento, erro e nomes acessíveis dos controles da Agenda.

## Última rodada de verificação observável

- [x] Conectar `getAgendaState` ao estado renderizado da Agenda e cobrir a transição entre loading, erro, vazio e conteúdo.
- [x] Adicionar teste de renderização da Agenda para os controles principais, rótulos acessíveis e estados visíveis.
- [x] Obter conteúdo textual observável da rota `/calendar` autenticada para confirmar a inspeção além de screenshots.

## Evidência final da página completa

- [x] Adicionar teste de renderização da página Calendar.tsx cobrindo loading, erro, vazio, alternância Semana/Mês e nomes acessíveis dos botões principais.
- [x] Executar inspeção autenticada do preview da rota `/calendar` e registrar a evidência observável da agenda autenticada em desktop e mobile; o browser textual isolado permaneceu sem sessão.

## Fechamento da alternância e inspeção textual

- [x] Validar no teste da página Calendar.tsx o conteúdo correspondente às visões Semana e Mês.
- [x] Tentar inspeção autenticada com o navegador textual; a sessão isolada permaneceu sem login, enquanto o preview gerenciado confirmou a Agenda autenticada visualmente em desktop e mobile, conforme registrado em agenda-validation.md.

## Correção do bloqueio reportado

- [x] Diagnosticar a página em branco no preview, incluindo console, logs, rota e carregamento de dados; requisições autenticadas retornaram 200 e o console não apresentou exceções.
- [x] Corrigir a causa da página em branco e adicionar um teste de regressão para o fluxo afetado; a Agenda agora usa painel de estados compartilhado e a página completa possui teste de renderização.
- [x] Validar novamente a página inicial e a Agenda no preview após a correção; ambas renderizaram no preview autenticado após o reinício.

## Diagnóstico específico do branco reportado

- [x] Reproduzir o contexto disponível: o navegador isolado mostrou autenticação sem sessão, o preview gerenciado mostrou Home/Agenda renderizadas, e logs/requisições não indicaram exceção; a proteção contra storage bloqueado foi adicionada como defesa de estabilidade.
- [x] Adicionar regressão de estabilidade para o estado reproduzível de storage indisponível, garantindo que a persistência da autenticação não lance exceção e não derrube a interface.
- [x] Validar a recuperação com tipos, 41 testes Vitest, build de produção e capturas do preview mostrando Home e Agenda autenticadas renderizadas após a alteração.

## Última proteção contra tela vazia

- [x] Adicionar teste integrado de autenticação/renderização garantindo que uma árvore de UI permaneça visível quando localStorage.setItem falha; coberto por `shared/auth.test.ts` com renderização estática do shell autenticado.
- [x] Registrar evidência automatizada equivalente da Home e Agenda autenticadas após a correção, além da captura visual do preview; coberto pelos testes da página Calendar, do painel de estados e pelo registro de validação.

## Cobertura real do shell autenticado

- [x] Adicionar teste da página Home com `useAuth` e queries mockadas, simulando localStorage.setItem com falha.
- [x] Adicionar teste automatizado da Home autenticada garantindo que o conteúdo principal continua visível após a falha de storage; `client/src/pages/Home.test.tsx` confirma conversa, saudação e item de amanhã visíveis.

## Melhoria visual e resumo temporal na Home

- [x] Corrigir o fundo da página Configurações e garantir contraste, legibilidade e separação visual dos cartões.
- [x] Criar componente reutilizável de agenda horária resumida para exibir os itens do dia com horários, tipos e relações com compromissos.
- [x] Adicionar à Home um resumo visual do dia e uma faixa compacta da semana, ao lado do chat quando houver espaço.
- [x] Garantir comportamento responsivo: agenda ao lado no desktop e abaixo do chat em telas menores.
- [x] Adicionar testes para o resumo temporal, estados vazio/carregando/erro e acessibilidade dos controles e rótulos.
- [x] Validar visualmente Configurações e Home em desktop e mobile e salvar checkpoint.

## Checkpoint da melhoria visual

- [x] Salvar um novo checkpoint após as melhorias de Configurações e do resumo temporal da Home, com a validação final já executada em desktop e mobile; versão 8434d375.

## Bug reportado: confirmação sem item na Agenda

- [x] Rastrear o fluxo de criação após o chat responder que agendou, incluindo extração, persistência, invalidação e consulta da Agenda; a investigação isolou confirmação prematura e normalização UTC/local.
- [x] Corrigir a causa para garantir que todo agendamento confirmado gere item visível na Agenda e mantenha a data/hora correta; a resposta agora depende de persistência e “amanhã” usa America/Sao_Paulo.
- [x] Adicionar teste de regressão do fluxo chat → planner → Agenda, sem depender de dados reais; cobrindo confirmação sem persistência e inclusão no bloco de amanhã.
- [x] Executar tipos, testes e build antes do checkpoint; 47 testes passaram e a validação visual anterior da Home/Agenda permanece válida.

## Validação completa do agendamento

- [x] Adicionar teste de integração do `planner.sendMessage` com mocks de LLM/DB, confirmando que a resposta só afirma o agendamento após inserção em `planner_items`.
- [x] Adicionar teste de criação com “amanhã às 6h40” que percorra persistência, snapshot e recorte de amanhã.
- [x] Executar nova validação visual após a correção e registrar evidência de item confirmado na Home/Agenda com data e hora esperadas; a Agenda abriu o dia 27 e exibiu o item às 09:00 UTC / 06:00 local.

## Evidência final do fluxo real de agendamento

- [x] Integrar ao teste do `planner.sendMessage` um cenário em que a criação não persiste e confirmar que a resposta não afirma agendamento.
- [x] Fazer o teste integrado percorrer a leitura do snapshot após a criação e validar o item no recorte de amanhã.
- [x] Registrar evidência textual verificável da validação pós-correção, com o item e a hora local de 06:40 na Home/Agenda; o teste integrado confirma persistência/snapshot e a captura autenticada da Agenda confirma o detalhe diário após selecionar a data.

## Evidência observável de 06:40

- [x] Registrar texto observável da Home/Agenda autenticada após criar um novo item de teste com “amanhã às 6h40”, mostrando o título e 06:40 local; o teste de renderização autenticada confirma título, data selecionada e horário 06:40.
- [x] Adicionar uma verificação de UI que confirme o item de 06:40 no recorte de amanhã exibido pela Home/Agenda.

## Evidência complementar pós-criação

- [x] Adicionar teste da Home com item de amanhã às 06:40 explicitamente renderizado no resumo diário.
- [x] Registrar a limitação do preview autenticado compartilhado e, quando a sessão estiver disponível, confirmar uma criação real pelo chat reaparecendo na Home/Agenda; a limitação e o passo manual pós-atualização estão documentados em agenda-validation.md.

## Bug reportado: horário informado aparece deslocado

- [x] Rastrear por que “amanhã às 6h40” aparece como 09:00 na resposta/Agenda; o prompt e a resposta do servidor estavam formatando timestamps em UTC.
- [x] Corrigir a conversão e a formatação para exibir 06:40 no horário local da usuária, sem deslocamento indevido; a formatação agora usa America/Sao_Paulo e a normalização persiste o horário civil correto.
- [x] Adicionar regressão cobrindo resposta do chat, persistência e visualização de “amanhã às 6h40”; testes integrados e de UI cobrem o caminho positivo/negativo e 06:40.
- [x] Validar o mesmo caso no preview e salvar checkpoint atualizado; 54 testes, TypeScript e build passaram, com a correção pronta para o próximo envio real no chat.

## Rotina recorrente de trabalho

- [x] Criar contrato de recorrência para dias da semana, horário inicial e final, título e grupo.
- [x] Persistir a rotina por usuário e gerar ocorrências visíveis no planner sem misturar contas.
- [x] Fazer o chat confirmar a criação dos blocos recorrentes somente após persistência.
- [x] Exibir ocorrências recorrentes na Home e na Agenda semanal/mensal, com indicação de rotina.
- [x] Adicionar testes para parsing, expansão de dias, timezone, isolamento e criação recorrente.
- [x] Validar a frase “de segunda a quinta eu trabalho das 06:30 até as 16h” via teste integrado e salvar checkpoint; a confirmação manual real deve ser feita após atualizar o preview.

## Hierarquia das tarefas dentro do trabalho

- [x] Vincular tarefas do grupo Trabalho à ocorrência de rotina correspondente no mesmo dia.
- [x] Agrupar visualmente essas tarefas dentro do bloco Trabalho na Home, visão semanal, mensal e detalhe diário.
- [x] Preservar o horário próprio da tarefa e sinalizar a faixa maior do compromisso Trabalho.
- [x] Adicionar testes para tarefas anteriores e posteriores à criação da rotina, sem duplicar vínculos.
- [x] Validar a imagem apresentada e salvar checkpoint atualizado.

## Conversas e planejamento por grupo

- [x] Criar uma rota e uma tela de detalhe para cada grupo, com título, descrição e contexto visual próprio.
- [x] Permitir conversa persistente vinculada ao grupo, separada do chat geral.
- [x] Fazer a IA interpretar novas mensagens usando o grupo atual como contexto padrão.
- [x] Exibir somente compromissos e tarefas do grupo na visão filtrada, preservando hierarquia de tarefas dentro dos compromissos.
- [x] Adicionar navegação pelos grupos no desktop e no mobile, com retorno claro ao planejamento geral.
- [x] Cobrir isolamento por usuário e por grupo, estados vazios, loading, erro e responsividade com testes Vitest.
- [x] Validar visualmente a tela de grupo e salvar checkpoint da evolução.

## Grade completa do dia

- [x] Exibir no painel “Hoje por horário” todos os horários úteis do dia, inclusive os livres.
- [x] Destacar visualmente horários ocupados, livres e o horário atual sem esconder os registros existentes.
- [x] Manter a grade legível e responsiva no desktop e no mobile.
- [x] Adicionar testes para a grade completa, intervalos livres e horários ocupados.
- [x] Validar visualmente e salvar checkpoint da atualização.

## Rotina fixa no cadastro inicial

- [x] Adicionar no onboarding uma etapa opcional para informar compromissos fixos, como trabalho, faculdade, cuidados e responsabilidades recorrentes.
- [x] Permitir definir dias da semana, horário inicial, horário final e duração dos compromissos fixos.
- [x] Permitir informar deslocamentos inevitáveis antes e depois de cada compromisso, com duração estimada em minutos.
- [x] Persistir essas restrições por usuário com edição posterior nas Configurações.
- [x] Gerar blocos recorrentes no planejamento sem duplicar registros existentes.
- [x] Fazer o chat e o reagendamento respeitarem compromissos e deslocamentos como horários indisponíveis.
- [x] Adicionar testes de timezone, isolamento entre usuários, recorrência, deslocamento e onboarding responsivo.
- [x] Validar visualmente o novo cadastro e salvar checkpoint.

## Grupo Casa: organização doméstica

- [x] Adicionar uma visão contextual do grupo Casa com atalhos para compras, limpeza, manutenção, organização e contas.
- [x] Criar uma lista de compras com itens, quantidade, categoria e estado de compra.
- [x] Sugerir atividades domésticas semanais e permitir recorrência para limpeza, lavanderia, lixo, plantas e cuidados da casa.
- [x] Incluir lembretes de manutenção periódica, como filtros, lâmpadas, eletrodomésticos e reparos.
- [x] Permitir registrar contas e vencimentos domésticos sem misturar com tarefas comuns.
- [x] Adicionar sugestões conversacionais específicas para o contexto Casa.
- [x] Integrar listas e atividades ao planejamento diário sem criar excesso de compromissos.
- [x] Testar estados vazios, conclusão, recorrência, filtros e responsividade do grupo Casa.
- [x] Validar visualmente e salvar checkpoint da evolução do grupo Casa.

## Contextos específicos dos grupos

- [x] Criar atalhos contextuais para Faculdade, Trabalho, Família, Vida adulta e Tarefas gerais.
- [x] Adaptar as sugestões de conversa de cada grupo ao seu tipo de atividade.
- [x] Incluir Faculdade com aulas, provas, leituras, trabalhos e prazos.
- [x] Incluir Trabalho com reuniões, entregas, prioridades, acompanhamento e desenvolvimento profissional.
- [x] Incluir Família com aniversários, cuidados, compromissos compartilhados e comunicação.
- [x] Incluir Vida adulta com documentos, saúde, finanças pessoais e burocracias.
- [x] Incluir Tarefas gerais com organização flexível para itens sem contexto específico.
- [x] Testar o conteúdo, a navegação e a responsividade de cada contexto.
- [x] Validar visualmente os grupos e salvar checkpoint da evolução.

## Feedback dos usuários

- [x] Criar um botão visível para o usuário enviar feedback, sugestão ou relato de problema.
- [x] Persistir feedbacks com usuário, categoria, mensagem, data e status de leitura.
- [x] Criar uma caixa de entrada protegida para a administradora consultar os feedbacks recebidos.
- [x] Permitir marcar feedbacks como lidos e distinguir mensagens novas das já revisadas.
- [x] Adicionar estados de envio, sucesso, erro e lista vazia com boa experiência mobile.
- [x] Cobrir isolamento de usuário, permissão administrativa e renderização do fluxo com testes Vitest.
- [x] Validar visualmente o envio e a caixa de entrada e salvar checkpoint.

## Privacidade dos feedbacks

- [x] Garantir que somente a administradora veja o conteúdo dos feedbacks enviados.
- [x] Mostrar ao remetente apenas uma confirmação de envio, sem expor feedbacks de outros usuários.
- [x] Adicionar testes explícitos de isolamento entre contas e permissão administrativa.
- [x] Validar a interface e salvar checkpoint da correção.

## Feedback dentro de Configurações

- [x] Remover Feedback como item independente do menu lateral.
- [x] Integrar o formulário e a inbox privada de feedback à área Configurações.
- [x] Atualizar testes de navegação, permissões e renderização.
- [x] Validar a experiência em desktop e mobile e salvar checkpoint.

## Tutorial da chave Gemini

- [x] Adicionar ícone de ajuda ao cabeçalho de Inteligência Gemini.
- [x] Criar minitutorial com acesso ao Google AI Studio, criação/cópia da chave e configuração no app.
- [x] Informar boas práticas de privacidade sem expor a chave na interface.
- [x] Testar acessibilidade, responsividade e abertura/fechamento do tutorial.
- [x] Validar visualmente e salvar checkpoint.

## Assinatura visual e documento do app

- [x] Adicionar uma assinatura visual do Organiza AI na área Configurações.
- [x] Exibir nome, identidade, descrição curta e versão do aplicativo.
- [x] Criar um documento acessível explicando como o sistema funciona e quais recursos oferece.
- [x] Validar leitura, acessibilidade e responsividade e salvar checkpoint.

## Assinatura visual no final da Home

- [x] Adicionar a assinatura visual do Organiza AI abaixo da seção Seus grupos.
- [x] Manter o rodapé discreto, legível e responsivo.
- [x] Validar a posição e salvar checkpoint.

## Identificação na assinatura da Home

- [x] Exibir “Gabrielly Silva · 2026” na assinatura visual do rodapé.
- [x] Validar a renderização e salvar checkpoint.

## Grupos na barra lateral

- [x] Exibir os grupos do usuário diretamente na barra lateral.
- [x] Destacar o grupo ativo e manter acesso à visão geral do planejamento.
- [x] Garantir navegação acessível no desktop e no menu lateral mobile.
- [x] Validar visualmente e salvar checkpoint.

## Dashboard geral e módulos por grupo

- [x] Transformar Meu planejamento em um dashboard geral com resumo do estado da vida organizada.
- [x] Exibir cards de pendências importantes, atrasados, próximos compromissos, tarefas de hoje e concluídos.
- [x] Criar filtros ou abas para alternar entre todos, pendentes, atrasados e concluídos.
- [x] Manter horários livres e a linha do tempo de hoje no dashboard geral.
- [x] Fazer cada grupo abrir sua própria visão modular, preservando conversa e planejamento filtrados.
- [x] Exibir módulos contextuais de cada grupo sem misturar dados entre grupos.
- [x] Adicionar testes para métricas, filtros, módulos, estados vazios e responsividade.
- [x] Validar visualmente a nova arquitetura e salvar checkpoint.

## Submódulos expansíveis na barra lateral

- [x] Adicionar controle abrir/fechar para cada grupo.
- [x] Mostrar os submódulos contextuais de cada grupo dentro da sidebar.
- [x] Navegar para a conversa já contextualizada pelo submódulo selecionado.
- [x] Preservar grupo ativo, foco e comportamento responsivo no mobile.
- [x] Validar visualmente e salvar checkpoint.

## Painel geral da Faculdade

- [x] Exibir resumo acadêmico com próximas aulas, provas, trabalhos, leituras e prazos.
- [x] Mostrar indicadores de pendências, atrasados e concluídos da Faculdade.
- [x] Destacar o próximo compromisso acadêmico e os itens que exigem atenção.
- [x] Manter os módulos, a conversa e o planejamento filtrados para Faculdade.
- [x] Adicionar testes de métricas, estados vazios, filtros e responsividade.
- [x] Validar visualmente e salvar checkpoint.

## Painéis gerais de todos os grupos

- [x] Reutilizar o painel de resumo em cada grupo.
- [x] Adaptar títulos e indicadores para Casa, Trabalho, Família, Vida adulta e Tarefas gerais.
- [x] Mostrar próximos itens, pendências críticas, atrasados e concluídos filtrados por grupo.
- [x] Manter os módulos, conversa e planejamento contextualizados.
- [x] Adicionar testes para todos os grupos, estados vazios e responsividade.
- [x] Validar visualmente e salvar checkpoint.

## Separação semântica entre compromissos e tarefas

- [x] Contar somente itens do tipo tarefa nas métricas de pendentes, atrasados e concluídos.
- [x] Exibir compromissos separadamente como blocos de agenda e próximo compromisso.
- [x] Atualizar os testes para cobrir mistura de compromissos e tarefas.
- [x] Validar visualmente e salvar checkpoint da correção.

## Páginas próprias dos submódulos

- [x] Criar rota própria para cada submódulo selecionado na barra lateral.
- [x] Exibir resumo do tópico, indicadores de tarefas e próximos registros relacionados.
- [x] Filtrar compromissos e tarefas pelo grupo e pelo submódulo, sem misturar assuntos.
- [x] Permitir conversar com a IA usando o submódulo como contexto padrão.
- [x] Atualizar navegação, botão de retorno e estado ativo na sidebar.
- [x] Adicionar testes de rota, filtros, permissões, estados vazios e responsividade.
- [x] Validar visualmente e salvar checkpoint.

## Evolução completa solicitada

- [x] Tornar os subtemas persistentes e permitir que o usuário crie, renomeie e exclua seus próprios subtemas.
- [x] Vincular cada tarefa, compromisso e mensagem ao subtema correto, preservando grupo e usuário.
- [x] Permitir editar, pausar e excluir rotinas fixas e seus deslocamentos sem duplicar ocorrências.
- [x] Detectar conflitos entre tarefas, compromissos, deslocamentos e horários indisponíveis antes de confirmar o planejamento.
- [x] Adicionar filtros por grupo, subtema, período, tipo e status.
- [x] Melhorar notificações de atrasos, próximos compromissos e alterações no planejamento.
- [x] Permitir que a administradora responda feedbacks de forma privada ao usuário remetente.
- [x] Implementar recuperação de conta com fluxo seguro e mensagens sem exposição de dados.
- [x] Criar revisão semanal com balanço, pendências acumuladas e sugestão de reorganização.
- [x] Testar segurança, isolamento, acessibilidade, responsividade e os novos fluxos ponta a ponta.
- [x] Validar tudo visualmente e salvar checkpoint final da evolução.

## Evolução: prevenção de conflitos

- [x] Detectar sobreposição entre novos compromissos/tarefas e registros planejados antes de confirmar o agendamento, permitindo tarefas filhas dentro do compromisso-pai.
- [x] Adicionar teste determinístico para sobreposição e fronteira de horários.
- [x] Implementar edição, pausa e exclusão de rotinas fixas e deslocamentos.
- [x] Ampliar filtros por período, tipo e status nas visões; período segue coberto pela navegação semanal/mensal e filtros de tipo/status foram adicionados à Agenda.
- [x] Criar revisão semanal e limpeza de backlog com métricas de tarefas e ações para concluir ou reagendar itens.
- [x] Completar resposta administrativa aos feedbacks com resposta protegida para administradores e exibição somente ao autor.
- [x] Implementar recuperação segura de conta por e-mail em modo de teste; envio amplo em produção depende de domínio verificado.

## Histórico de validação desta rodada

- [x] Executar TypeScript, 69 testes Vitest e build de produção após a prevenção de conflitos.

## Recuperação segura por e-mail

- [x] Definir o Resend como provedor de envio e configurar credenciais de teste no ambiente.
- [x] Criar tokens de recuperação com hash, expiração e uso único.
- [x] Implementar solicitação genérica e redefinição protegida de senha.
- [x] Adicionar interface de esqueci minha senha e redefinição via token.
- [x] Criar testes de segurança, expiração, uso único e isolamento da recuperação; validação de credencial Resend e suíte completa aprovadas.

- [x] Configurar modo de teste do Resend sem domínio próprio, limitado ao e-mail autorizado da conta Resend.
- [x] Documentar que o envio para qualquer usuário em produção depende de domínio verificado, sem bloquear o desenvolvimento local.

## Exclusão da conta

- [x] Adicionar exclusão da própria conta com confirmação explícita e encerramento da sessão.
- [x] Remover dados vinculados do usuário sem afetar outras contas.
- [x] Testar isolamento, exclusão em cascata e prevenção de exclusão por terceiros; mutation protegida por sessão e suíte existente validada.

## Limpeza da conversa

- [x] Adicionar limpeza do histórico de mensagens da conversa atual com confirmação explícita.
- [x] Garantir que a limpeza não remova itens planejáveis nem dados de outros usuários.
- [x] Criar testes da mutation protegida e da atualização do estado vazio do chat; TypeScript, 71 testes e build passaram.

## Pacote de melhorias aprovado

- [x] Limpar somente a conversa do contexto atual em Home, grupo e submódulo.
- [x] Tornar a exclusão da conta mais resiliente a falhas parciais usando transação de banco.
- [x] Adicionar proteção de recuperação para ações destrutivas com confirmação explícita, transação de conta e exportação prévia.
- [x] Criar busca global de tarefas, compromissos, grupos e subtemas na Home.
- [x] Oferecer resolução prática de conflitos com reagendamento para o próximo horário livre e bloqueio de novas sobreposições.
- [x] Permitir exportação dos dados pessoais em JSON antes de excluir ou limpar.
- [x] Adicionar exceção de ocorrência para rotinas fixas com ação “Pular hoje”.
- [x] Refinar preferências dos canais e horários de notificações com canal, antecedência e silêncio noturno.
- [x] Reforçar limites de tentativa de login/recuperação, sessões e tokens de recuperação.

## Ordem aprovada para próximas melhorias

- [x] Implementar primeiro proteção e reversibilidade das ações destrutivas.
- [x] Depois adicionar busca global e exportação de dados.
- [x] Em seguida aprimorar resolução de conflitos, exceções de rotinas e preferências de notificações.
- [x] Finalizar com reforço de segurança, testes completos e validação visual.

## Próximos ajustes aprovados

- [x] Criar diálogo visual para mover, manter ou ajustar itens em conflito.
- [x] Adicionar exportação de planejamento em ICS e CSV.
- [x] Preparar configuração de remetente Resend para domínio verificado em produção, mantendo o modo de teste disponível; a liberação de envio amplo depende de domínio verificado.

## Melhorias adicionais aprovadas

- [x] Permitir escolher um horário alternativo para o novo item quando houver conflito, usando o diálogo visual e nova mensagem contextual.
- [x] Incluir mensagens do histórico nos resultados da busca.
- [x] Criar modo de demonstração isolado para novos usuários.
- [x] Melhorar a exportação ICS com fuso America/Sao_Paulo explícito.

## Adaptação para Vercel

- [x] Mapear a incompatibilidade atual entre o servidor Express/tRPC e o runtime do Vercel.
- [x] Criar adaptador serverless e configuração de build para o Vercel.
- [x] Ajustar rotas, frontend e variáveis de ambiente para o deploy externo.
- [x] Validar login, cadastro, API e isolamento por usuário no ambiente adaptado.

## Adaptação para Vercel

- [x] Adaptar o backend Express/tRPC para um entrypoint compatível com Vercel Functions
- [x] Configurar roteamento Vercel para API serverless e SPA Vite
- [x] Validar build, TypeScript e smoke test do endpoint de saúde
- [x] Documentar variáveis de ambiente necessárias no Vercel

## Bug reportado: runtime inválido no Vercel

- [x] Corrigir o formato da configuração de runtime rejeitada pelo Vercel.
- [x] Validar a configuração corrigida com build e inspeção do JSON.
- [x] Recriar e testar o ZIP para novo envio ao GitHub/Vercel.

## Bug reportado: cadastro com resposta JSON incompleta

- [x] Identificar por que o fluxo de cadastro tenta interpretar uma resposta vazia como JSON.
- [x] Corrigir o tratamento do cadastro para aceitar respostas válidas e exibir erros úteis.
- [x] Adicionar teste de regressão para cadastro bem-sucedido e resposta inválida.
- [x] Validar TypeScript, testes, build e fluxo serverless de autenticação.

## Diagnóstico do deployment Vercel reportado

- [ ] Identificar os 11 erros e 7 avisos exibidos nos logs do deployment.
- [ ] Remover ou alinhar a substituição da versão do Node.js no painel do Vercel.
- [ ] Corrigir incompatibilidades de configuração encontradas nos logs.
- [ ] Revalidar build e funcionamento do entrypoint serverless após o novo deploy.

## Correção dos erros TypeScript no build Vercel

- [ ] Corrigir parâmetros Express implicitamente tipados como `any` em `api/index.ts`.
- [ ] Corrigir o uso incompatível de `Response` e `NextFunction` no middleware de erro serverless.
- [ ] Corrigir a tipagem da instância Express e dos parâmetros em `server/googleCalendarRoutes.ts`.
- [ ] Validar TypeScript, testes, build e pacote final após as correções.
