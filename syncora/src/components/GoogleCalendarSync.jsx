import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Calendar, RefreshCw, Link2, Unlink, Loader2 } from 'lucide-react';

const CONNECTOR_ID = '6a9fdedbc5048920c14fd240';

export default function GoogleCalendarSync() {
  const [connected, setConnected] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const check = async () => {
    try {
      const res = await base44.functions.invoke('syncGoogleCalendar', { mode: 'check' });
      setConnected(res.data?.connected === true);
    } catch (e) {
      setConnected(false);
    }
  };

  useEffect(() => {
    base44.auth.isAuthenticated().then((authed) => {
      if (authed) check();
      else setConnected(false);
    });
  }, []);

  const handleConnect = async () => {
    try {
      const url = await base44.connectors.connectAppUser(CONNECTOR_ID);
      const popup = window.open(url, '_blank');
      const timer = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(timer);
          check();
        }
      }, 600);
    } catch (e) {
      setError('Não foi possível iniciar a conexão.');
    }
  };

  const handleDisconnect = async () => {
    try {
      await base44.connectors.disconnectAppUser(CONNECTOR_ID);
      setConnected(false);
      setResult(null);
    } catch (e) {}
  };

  const handleSync = async () => {
    setSyncing(true);
    setError('');
    setResult(null);
    try {
      const res = await base44.functions.invoke('syncGoogleCalendar', { mode: 'sync' });
      setResult(res.data);
      if (res.data?.connected === false) setConnected(false);
    } catch (e) {
      setError('Falha na sincronização.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="rounded-xl border p-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-sm font-medium flex items-center gap-2">
          <Calendar className="w-4 h-4" /> Google Calendar
        </div>
        <div className="text-xs text-muted-foreground">
          {connected === null
            ? 'Verificando…'
            : connected
            ? 'Conectado — sincronize para puxar eventos.'
            : 'Conecte sua agenda Google para importar eventos.'}
        </div>
        {result?.imported != null && (
          <div className="text-xs text-green-600 mt-1">{result.imported} evento(s) importado(s).</div>
        )}
        {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {connected ? (
          <>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="text-sm border rounded-lg px-3 py-1.5 flex items-center gap-1.5 hover:bg-muted transition disabled:opacity-50"
            >
              {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Sincronizar
            </button>
            <button
              onClick={handleDisconnect}
              className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"
            >
              <Unlink className="w-3.5 h-3.5" /> Desconectar
            </button>
          </>
        ) : (
          <button
            onClick={handleConnect}
            className="text-sm bg-primary text-primary-foreground rounded-lg px-3 py-1.5 flex items-center gap-1.5 hover:opacity-90 transition"
          >
            <Link2 className="w-3.5 h-3.5" /> Conectar
          </button>
        )}
      </div>
    </div>
  );
}