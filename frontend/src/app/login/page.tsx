'use client';

import { FileText } from 'lucide-react';
import AuthSwitch from '@/components/ui/auth-switch';

/**
 * demo.tsx pattern:
 *   import AuthSwitch from './auth-switch';
 *   export default function Demo() { return <AuthSwitch />; }
 *
 * This login page IS the demo — it wraps AuthSwitch in the page shell.
 */
export default function LoginPage(): React.ReactNode {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
        <div className="w-[600px] h-[400px] rounded-full bg-[#0071e3] opacity-[0.07] blur-[120px]" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#0071e3] flex items-center justify-center mb-4 shadow-lg shadow-[#0071e3]/30">
            <FileText size={26} className="text-white" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Invoice Manager</h1>
          <p className="text-[#6e6e73] text-sm mt-1">Manage invoices and inventory</p>
        </div>

        {/* ── AuthSwitch form card ── */}
        <div className="bg-[#1d1d1f] rounded-2xl p-8 border border-white/[0.08] shadow-2xl shadow-black/60">
          <AuthSwitch />
        </div>

        {/* Demo hint */}
        <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-center">
          <p className="text-[#6e6e73] text-[11px] font-semibold uppercase tracking-wider mb-1.5">
            Demo Credentials
          </p>
          <div className="flex justify-center gap-6 text-sm">
            <span className="text-white/50">
              User: <code className="text-white font-mono">admin</code>
            </span>
            <span className="text-white/50">
              Pass: <code className="text-white font-mono">password123</code>
            </span>
          </div>
        </div>

        <p className="text-center text-[#3a3a3c] text-xs mt-5">
          Protected by JWT Authentication · Invoice Manager
        </p>
      </div>
    </div>
  );
}