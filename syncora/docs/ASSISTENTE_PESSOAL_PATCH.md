# Syncora — Fundação de Assistente Pessoal

Este patch transforma o planejamento de tarefas de um simples “primeiro horário inteiro livre” em um motor baseado em intervalos reais.

## Implementado

1. Prazo separado de execução
- `due_date`: prazo final.
- `planned_date`: dia escolhido para executar.
- `scheduled_time` / `scheduled_end_time`: bloco planejado.

2. Planejamento por intervalos
- Slots de 15 minutos.
- Preserva minutos de janelas como `06:30-16:00`.
- Considera duração da tarefa.
- Considera início/fim de compromissos.
- Considera compromissos recorrentes.
- Considera outras tarefas já planejadas.
- Procura espaço desde hoje até o prazo.

3. Metadados de assistente
TaskItem ganhou:
- `duration_minutes`
- `deadline_time`
- `earliest_date`
- `earliest_time`
- `priority`
- `energy_level`
- `splittable`
- `minimum_block_minutes`
- `preferred_period`
- `planning_status`
- `snoozed_until`
- `last_rescheduled_at`
- `reschedule_count`

4. Estados de acompanhamento
- unscheduled
- scheduled
- started
- snoozed
- missed
- rescheduled
- completed

5. Novas ações de conversa
A função `chatWithGemini` agora entende e executa:
- `start_task`
- `complete_task`
- `snooze_task`
- `reschedule_task`
- `replan_day`

Além das ações que já existiam para criar tarefas, compromissos e recorrências.

6. Replanejamento
`replan_day` reorganiza tarefas flexíveis preservando os compromissos fixos e tentando recolocar as tarefas em espaços válidos até seus prazos.

7. Agenda
A agenda passa a exibir tarefas pelo `planned_date` quando disponível; registros antigos continuam usando `due_date` como fallback.

8. Lista manual de tarefas
A criação manual agora aceita duração em minutos e usa o mesmo conceito de intervalos, inclusive respeitando recorrências e horários com minutos.

9. Fuso horário
`UserSettings` ganhou `timezone`, com padrão `America/Sao_Paulo`.

## Arquivos alterados

- `base44/entities/TaskItem.jsonc.txt`
- `base44/entities/Commitment.jsonc.txt`
- `base44/entities/UserSettings.jsonc.txt`
- `base44/functions/chatWithGemini/entry.ts.txt`
- `src/componentes/TaskList.jsx.txt`
- `src/biblioteca/agendaUtils.js.txt`
- `src/p#U00e1ginas/DayPlan.txt`
- `src/p#U00e1ginas/Home.txt`

## Ainda não implementado neste patch

- Web Push / push no celular.
- Scheduler/cron que acorda sozinho no horário da tarefa.
- Follow-up automático sem o usuário abrir o app.
- Sincronização bidirecional com Google Calendar.
- Divisão automática de uma tarefa `splittable` em vários blocos. O campo já existe para a próxima etapa.

## Observação sobre o ZIP original

O export recebido usa extensões `.txt` e nomes de pastas alterados, além de conter pelo menos um arquivo corrompido (`UserNotRegisteredError.jsx.txt`). Por isso este patch preserva o formato do export recebido, mas ele não deve ser tratado como um repositório Vite limpo pronto para `npm run build` sem antes normalizar o export.

## Automação adicionada

Foi adicionada a função `runAssistantAutomation`, chamada automaticamente pelo componente `AutomaticAssistant` a cada 60 segundos, ao voltar para a aba e ao focar a janela.

Ela:
- lembra compromissos 15 minutos antes e no horário;
- avisa no início de tarefas planejadas;
- respeita `snoozed_until` e volta a cobrar quando o adiamento termina;
- detecta tarefas que passaram do bloco planejado sem conclusão;
- marca a tarefa como `missed` e procura automaticamente um novo horário antes do prazo;
- se encontrar espaço, atualiza a tarefa para `rescheduled` e informa o novo horário;
- se não encontrar espaço antes do prazo, gera alerta de risco;
- avisa quando um prazo com horário está a menos de 2 horas;
- registra cada disparo em `AssistantReminder` para evitar duplicação entre recargas e dispositivos.

### Limite atual
A automação é 100% automática enquanto o web app estiver aberto/ativo (inclusive quando o usuário volta à aba). Notificação web exige permissão do navegador. Para garantir execução com o navegador e o app totalmente fechados, é necessário ligar a mesma função `runAssistantAutomation` a um scheduler/cron externo ou a um workflow da plataforma. A função foi isolada justamente para permitir essa evolução sem reescrever a lógica.
