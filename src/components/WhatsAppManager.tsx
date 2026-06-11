import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../lib/supabase';
import { Smartphone, LogOut, RefreshCw, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type WaStatus = 'UNPAIRED' | 'CONNECTED' | 'LOGOUT_REQUESTED';

interface WaSession {
  id: string;
  status: WaStatus;
  qr_code: string | null;
}

export function WhatsAppManager() {
  const [session, setSession] = useState<WaSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSession();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whatsapp_sessions', filter: 'id=eq.main_session' },
        (payload) => {
          setSession(payload.new as WaSession);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchSession() {
    setLoading(true);
    const { data, error } = await supabase
      .from('whatsapp_sessions')
      .select('id, status, qr_code')
      .eq('id', 'main_session')
      .single();
    
    if (!error && data) {
      setSession(data as WaSession);
    }
    setLoading(false);
  }

  async function handleLogout() {
    if (!session) return;
    
    // Set status to LOGOUT_REQUESTED, let backend handle the actual logout
    await supabase
      .from('whatsapp_sessions')
      .update({ status: 'LOGOUT_REQUESTED', qr_code: null })
      .eq('id', 'main_session');
  }

  if (loading) {
    return (
      <div className="bg-card p-6 rounded-xl border border-slate-700/50 shadow-md flex items-center justify-center min-h-[300px]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="bg-card p-6 rounded-xl border border-slate-700/50 shadow-md">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2">
          <Smartphone className="text-primary" />
          WhatsApp Bot Status
        </h3>
        <button 
          onClick={fetchSession}
          className="p-2 text-muted hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          title="Refresh Status"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      <div className="flex flex-col items-center justify-center min-h-[250px]">
        <AnimatePresence mode="wait">
          {!session || session.status === 'UNPAIRED' ? (
            <motion.div
              key="unpaired"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center text-center space-y-4"
            >
              {session?.qr_code ? (
                <>
                  <div className="bg-white p-4 rounded-xl shadow-lg">
                    <QRCodeSVG value={session.qr_code} size={200} />
                  </div>
                  <p className="text-sm text-muted max-w-xs">
                    Scan this QR code with your WhatsApp app to link the device. (Updates automatically)
                  </p>
                </>
              ) : (
                <div className="flex flex-col items-center space-y-3">
                  <Loader2 className="animate-spin text-primary" size={32} />
                  <p className="text-sm text-muted">Waiting for QR Code from server...</p>
                  <p className="text-xs text-slate-500">Make sure the Node.js wa_trigger backend is running.</p>
                </div>
              )}
            </motion.div>
          ) : session.status === 'CONNECTED' ? (
            <motion.div
              key="connected"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center text-center space-y-6"
            >
              <div className="w-24 h-24 bg-success/20 rounded-full flex items-center justify-center">
                <Smartphone size={40} className="text-success" />
              </div>
              <div>
                <h4 className="text-lg font-medium text-success">Device Connected</h4>
                <p className="text-sm text-muted mt-1">
                  The bot is active and ready to send trade signals to the group.
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-danger/20 text-danger hover:bg-danger/30 px-6 py-2.5 rounded-lg font-medium transition-colors"
              >
                <LogOut size={18} />
                Logout Device
              </button>
            </motion.div>
          ) : session.status === 'LOGOUT_REQUESTED' ? (
            <motion.div
              key="logging_out"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center space-y-3"
            >
              <Loader2 className="animate-spin text-warning" size={32} />
              <h4 className="text-lg font-medium text-warning">Logging out...</h4>
              <p className="text-sm text-muted">Please wait while the server disconnects the device.</p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
