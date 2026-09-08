import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import Sidebar from '@/components/Sidebar';
import AutomaticAssistant from '@/components/AutomaticAssistant';

export default function AppLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const list = await base44.entities.UserSettings.filter({ created_by_id: user.id });
        if (!list[0]?.onboarded) {
          navigate('/onboarding');
          return;
        }
      } catch (e) {
        // ignore, let pages handle
      }
      setChecking(false);
    })();
  }, [user]);

  if (checking) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col md:flex-row">
      <AutomaticAssistant />
      <Sidebar />
      <main className="flex-1 overflow-hidden flex flex-col min-h-0">
        <Outlet />
      </main>
    </div>
  );
}