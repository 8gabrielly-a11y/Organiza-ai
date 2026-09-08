import React, { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Leaf, LayoutDashboard, MessageSquare, CalendarDays, Settings as SettingsIcon, ChevronRight, Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getIcon } from '@/lib/icons';
import ThemeToggle from '@/components/ThemeToggle';

const nav = [
  { to: '/', label: 'Meu planejamento', icon: LayoutDashboard },
  { to: '/chat', label: 'Chat com a IA', icon: MessageSquare },
  { to: '/plano', label: 'Agenda', icon: CalendarDays },
  { to: '/config', label: 'Configurações', icon: SettingsIcon }
];

const mobileNav = [
  { to: '/', label: 'Início', icon: LayoutDashboard },
  { to: '/chat', label: 'Chat', icon: MessageSquare },
  { to: '/plano', label: 'Agenda', icon: CalendarDays },
  { to: '/grupos', label: 'Grupos', icon: Leaf },
  { to: '/config', label: 'Config', icon: SettingsIcon }
];

export default function Sidebar() {
  const { user } = useAuth();
  const [settings, setSettings] = useState(null);
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const l = await base44.entities.UserSettings.filter({ created_by_id: user.id });
        setSettings(l[0]);
        const g = (await base44.entities.Group.list()).filter((x) => !x.parent_id);
        g.sort((a, b) => (a.order || 0) - (b.order || 0));
        setGroups(g);
      } catch (e) {}
    })();
  }, [user]);

  const name = settings?.user_name || user?.full_name || user?.email || '';
  const initial = (name || '?').trim().charAt(0).toUpperCase();

  return (
    <>
      <aside className="hidden md:flex w-64 flex-col bg-sidebar border-r border-sidebar-border">
        <div className="p-5 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <Leaf className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <div className="font-semibold leading-tight text-sidebar-foreground">Organiza AI</div>
            <div className="text-xs text-sidebar-foreground/60">seu planejador</div>
          </div>
          <ThemeToggle />
        </div>

        <nav className="px-3 space-y-1">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-full text-sm transition ${
                  isActive
                    ? 'bg-sidebar-accent text-primary font-medium'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-primary'
                }`
              }
            >
              <n.icon className="w-5 h-5" />
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-5 pt-6 pb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/50">Seus grupos</span>
          <Link to="/grupos" className="text-sidebar-foreground/50 hover:text-primary" title="Gerenciar grupos">
            <Plus className="w-4 h-4" />
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-0.5">
          {groups.map((g) => {
            const Icon = getIcon(g.icon);
            return (
              <NavLink
                key={g.id}
                to={`/grupo/${g.id}`}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${
                    isActive
                      ? 'bg-sidebar-accent text-primary font-medium'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60'
                  }`
                }
              >
                <span
                  className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                  style={{ backgroundColor: g.color + '22', color: g.color }}
                >
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <span className="flex-1 truncate">{g.name}</span>
                <ChevronRight className="w-4 h-4 opacity-50" />
              </NavLink>
            );
          })}
          {groups.length === 0 && (
            <p className="text-xs text-sidebar-foreground/50 px-3 py-2">Nenhum grupo ainda</p>
          )}
        </div>

        <div className="p-4 border-t border-sidebar-border flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium shrink-0">
            {initial}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-sidebar-foreground truncate">{name}</div>
            <div className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</div>
          </div>
        </div>
      </aside>

      <nav className="md:hidden fixed bottom-0 inset-x-0 border-t bg-background flex justify-around py-2 z-20">
        {mobileNav.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 text-[11px] px-2 ${isActive ? 'text-primary' : 'text-muted-foreground'}`
            }
          >
            <n.icon className="w-5 h-5" />
            {n.label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}