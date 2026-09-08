import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Check, ShoppingCart } from 'lucide-react';

export default function ShoppingList({ groupId }) {
  const [items, setItems] = useState([]);
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');

  const load = async () => {
    const all = await base44.entities.ShoppingItem.filter({ group_id: groupId });
    all.sort((a, b) => (a.order || 0) - (b.order || 0));
    setItems(all);
  };

  useEffect(() => {
    load();
  }, [groupId]);

  const add = async () => {
    if (!name.trim()) return;
    await base44.entities.ShoppingItem.create({
      group_id: groupId,
      name: name.trim(),
      quantity: qty.trim(),
      done: false,
      order: items.length
    });
    setName('');
    setQty('');
    load();
  };

  const toggle = async (item) => {
    await base44.entities.ShoppingItem.update(item.id, { done: !item.done });
    load();
  };

  const remove = async (id) => {
    await base44.entities.ShoppingItem.delete(id);
    load();
  };

  const pending = items.filter((i) => !i.done);
  const done = items.filter((i) => i.done);

  const Row = ({ item }) => (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2">
      <button onClick={() => toggle(item)} className="shrink-0">
        <Check
          className={`w-5 h-5 rounded-full border-2 p-0.5 ${item.done ? 'bg-primary text-primary-foreground border-primary' : 'text-muted-foreground border-muted-foreground/40'}`}
        />
      </button>
      <span className={`flex-1 text-sm ${item.done ? 'line-through opacity-50' : ''}`}>{item.name}</span>
      {item.quantity && <span className="text-xs text-muted-foreground">{item.quantity}</span>}
      <button onClick={() => remove(item.id)} className="text-muted-foreground hover:text-destructive">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h2 className="font-medium mb-1 flex items-center gap-2">
        <ShoppingCart className="w-4 h-4" /> Lista de compras
      </h2>
      <p className="text-xs text-muted-foreground mb-4">Anote o que precisa comprar. Marque quando pegar.</p>

      <div className="flex gap-2 mb-5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Item (ex: arroz, detergente...)"
          className="flex-1 border rounded-lg px-3 py-2 text-sm"
        />
        <input
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Qtd"
          className="w-20 border rounded-lg px-3 py-2 text-sm"
        />
        <button
          onClick={add}
          className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm flex items-center gap-1 hover:opacity-90 transition"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center border border-dashed rounded-xl">
          Lista vazia. Adicione o que precisa comprar.
        </p>
      ) : (
        <div className="space-y-4">
          {pending.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs text-muted-foreground px-1">Para comprar ({pending.length})</div>
              {pending.map((i) => (
                <Row key={i.id} item={i} />
              ))}
            </div>
          )}
          {done.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs text-muted-foreground px-1">No carrinho ({done.length})</div>
              {done.map((i) => (
                <Row key={i.id} item={i} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}