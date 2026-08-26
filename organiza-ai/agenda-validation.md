# Validação da Agenda

A rota `/calendar` foi verificada no preview autenticado em viewport desktop de 1280×900 e em viewport móvel de 390×844. A visão semanal exibiu os dias de segunda a domingo, itens dentro das colunas e o painel de detalhe do dia; em celular, a grade semanal preservou a leitura com rolagem horizontal e o detalhe permaneceu abaixo da agenda.

A visão mensal foi aberta com `/calendar?view=month` e exibiu o mini calendário de agosto de 2026, navegação entre meses, dia selecionado, indicadores por dia e legenda separando compromissos, tarefas e atualizações. A navegação lateral mostrou a entrada Agenda; o preview autenticado exibiu dados de planner existentes nos dias 27 e 28.

Os controles principais usam botões com rótulos/aria-label, foco visível e estados de vazio, carregamento e erro no código da página. A suíte validou os limites de dia local, semana, mês e relação compromisso-tarefa. A validação manual não incluiu a gravação de um novo item no navegador porque a ferramenta de preview não disponibiliza interação de preenchimento nesta sessão.

## Evidência complementar

As capturas finais do preview autenticado exibiram o nome e e-mail do usuário na barra lateral, a rota Agenda ativa, o mini calendário mensal com indicadores nos dias 27 e 28 e a seção “Agenda do mês” com os itens agrupados por dia. No celular de 390×844, a mesma lista permaneceu legível abaixo do mini calendário, seguida pelos painéis “Dia selecionado” e “Como estamos organizando”. A revisão confirmou que os controles de alternância Semana/Mês, navegação mensal, seleção de dia e retorno à conversa são botões alcançáveis e apresentam foco visível via classes `focus-visible`.

## Limite da inspeção textual

A navegação textual isolada para `/calendar?view=month` retornou a tela pública de autenticação, com os campos E-mail e Senha. Portanto, não foi possível extrair texto autenticado pelo navegador isolado nesta sessão. A confirmação autenticada disponível foi a captura do preview gerenciado, que mostrou o nome/e-mail do usuário, a barra lateral da Agenda, os itens de planner e a agenda mensal agrupada. A cobertura automatizada da página completa valida os estados e os rótulos renderizados sem acessar dados reais.

## Estabilidade após o relato de página vazia

A investigação do preview encontrou requisições autenticadas bem-sucedidas (HTTP 200), nenhuma exceção no console e renderização normal de Home e Agenda após o reinício. Como defesa contra um caso compatível com tela vazia em previews incorporados ou navegação privada, a persistência `localStorage` do hook de autenticação passou a ser tolerante a falhas. A regressão foi testada tanto no helper quanto na renderização de uma árvore de UI; a suíte passou com 42 testes.

## Correção do agendamento confirmado

A cadeia integrada `planner.sendMessage` foi exercitada com LLM e banco simulados: o caminho feliz persiste o item, retorna o item no snapshot e confirma o agendamento; o caminho sem título não insere `planner_items` e não afirma que agendou. A expressão “amanhã às 6h40” é convertida para o horário civil de São Paulo antes da persistência. A validação de UI renderiza o título “Fazer os indicadores” e “06:40” no detalhe de amanhã. O preview autenticado foi revisado visualmente com dados existentes; a criação real pela conta da usuária deve ser confirmada ao enviar uma nova mensagem após atualizar o preview.
