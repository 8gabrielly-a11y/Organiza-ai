import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, MessageSquare, Clock, ListTodo, FolderTree } from 'lucide-react';
import { getIcon } from '@/lib/icons';
import { moduleMap } from '@/lib/modules';
import { todayStr } from '@/lib/dateUtils';
import GroupChat from '@/components/GroupChat';
import TimeGrid from '@/components/TimeGrid';
import GroupCommitments from '@/components/GroupCommitments';
import ShoppingList from '@/components/ShoppingList';
import WeeklyTasks from '@/components/WeeklyTasks';
import MealPlan from '@/components/MealPlan';
import TaskList from '@/components/TaskList';
import Notes from '@/components/Notes';
import Subgroups from '@/components/Subgroups';

const MODULE_COMPONENTS = {
  compras: ShoppingList,
  semanal: WeeklyTasks,
  cardapio: MealPlan,
  tarefas: TaskList,
  notas: Notes
};

export default function GroupSpace() {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [parent, setParent] = useState(null);
  const [commitments, setCommitments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [tab, setTab] = useState('conversa');

  const load = async () => {
    const groups = await base44.entities.Group.list();
    const g = groups.find((x) => x.id === id);
    setGroup(g);
    if (g?.parent_id) setParent(groups.find((x) => x.id === g.parent_id));
    if (g) {
      const comms = await base44.entities.Commitment.filter({ group_id: id });
      setCommitments(comms);
      const tks = await base44.entities.TaskItem.filter({ group_id: id, due_date: todayStr() });
      setTasks(tks);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  if (!group) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Carregando...
      </div>
    );
  }

  const Icon = getIcon(group.icon);
  const enabled = group.modules || [];

  const baseTabs = [
    { key: 'conversa', label: 'Conversa', icon: MessageSquare },
    { key: 'hoje', label: 'Hoje', icon: Clock },
    { key: 'compromissos', label: 'Compromissos', icon: ListTodo },
    { key: 'areas', label: 'Áreas', icon: FolderTree }
  ];
  const moduleTabs = enabled.map((k) => ({
    key: k,
    label: moduleMap[k]?.label || k,
    icon: moduleMap[k]?.icon || ListTodo
  }));
  const tabs = [...baseTabs, ...moduleTabs];

  const updateStatus = async (cid, status, newDate) => {
    const data = { status };
    if (newDate) data.scheduled_date = newDate;
    await base44.entities.Commitment.update(cid, data);
    load();
  };

  const updateTask = async (tid, done) => {
    await base44.entities.TaskItem.update(tid, { done });
    load();
  };

  const renderTab = () => {
    if (tab === 'conversa') return <GroupChat groupId={group.id} groupName={group.name} />;
    if (tab === 'hoje')
      return (
        <div className="h-full overflow-y-auto pb-16 md:pb-3">
          <TimeGrid
            commitments={commitments}
            tasks={tasks}
            group={group}
            onAction={updateStatus}
            onTaskAction={updateTask}
          />
        </div>
      );
    if (tab === 'compromissos')
      return (
        <div className="h-full overflow-y-auto pb-16 md:pb-3">
          <GroupCommitments groupId={group.id} />
        </div>
      );
    if (tab === 'areas')
      return (
        <div className="h-full overflow-y-auto pb-16 md:pb-3">
          <Subgroups group={group} />
        </div>
      );
    const C = MODULE_COMPONENTS[tab];
    if (C)
      return (
        <div className="h-full overflow-y-auto pb-16 md:pb-3">
          <C groupId={group.id} />
        </div>
      );
    return null;
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <header className="px-4 py-3 border-b bg-background">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <Link to={parent ? `/grupo/${parent.id}` : '/'} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: group.color + '22', color: group.color }}
          >
            <Icon className="w-5 h-5" />
          </span>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold leading-tight truncate">{group.name}</h1>
            {parent && <span className="text-xs text-muted-foreground">em {parent.name}</span>}
          </div>
        </div>
      </header>

      <div className="flex gap-1 px-4 border-b overflow-x-auto bg-background">
        <div className="flex gap-1 max-w-4xl mx-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-sm whitespace-nowrap border-b-2 transition ${
                tab === t.key
                  ? 'border-primary text-primary font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">{renderTab()}</div>
    </div>
  );
}