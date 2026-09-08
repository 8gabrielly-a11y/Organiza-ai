import { ShoppingCart, Repeat, Utensils, ListTodo, StickyNote } from 'lucide-react';

export const MODULES = [
  { key: 'compras', label: 'Lista de compras', icon: ShoppingCart },
  { key: 'semanal', label: 'Rotina semanal', icon: Repeat },
  { key: 'cardapio', label: 'Cardápio da semana', icon: Utensils },
  { key: 'tarefas', label: 'Lista de tarefas', icon: ListTodo },
  { key: 'notas', label: 'Notas', icon: StickyNote }
];

export const moduleMap = Object.fromEntries(MODULES.map((m) => [m.key, m]));