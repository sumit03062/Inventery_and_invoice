'use client';

import { useState, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import {
  LogIn,
  UserPlus,
  User,
  Lock,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = 'signin' | 'signup';

interface FormState {
  username: string;
  password: string;
  confirm: string;
}

// ─── Component (matches template structure: useState + cn) ────────────────────

/**
 * AuthSwitch — A self-contained, switchable auth form component.
 *
 * State-driven (following the template's useState pattern):
 *  - `mode`      : toggles between 'signin' and 'signup' tabs
 *  - `form`      : controlled inputs (username / password / confirm)
 *  - `showPass`  : password visibility toggle
 *  - `loading`   : async submit state
 *  - `error`     : server-side error message
 *
 * Usage:
 *   import AuthSwitch from '@/components/ui/auth-switch';
 *   <AuthSwitch />
 */
export const Component = () => {
  const [mode, setMode] = useState<Mode>('signin');
  const [form, setForm] = useState<FormState>({ username: '', password: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();
  const router = useRouter();

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  };

  const handleModeSwitch = (next: Mode) => {
    setMode(next);
    setForm({ username: '', password: '', confirm: '' });
    setError(null);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    // Basic validation
    if (!form.username.trim() || !form.password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    if (mode === 'signup' && form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signin') {
        const ok = await login(form.username, form.password);
        if (ok) {
          router.push('/dashboard');
        } else {
          setError('Invalid username or password.');
          setForm((prev) => ({ ...prev, password: '' }));
        }
      } else {
        // Signup: placeholder — wire to your register API here
        setError('Registration is not yet enabled. Please use the demo account.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className={cn(
        'flex flex-col items-center w-full max-w-sm mx-auto',
        'gap-6 p-0 rounded-2xl',
      )}
    >
      {/* ── Tab Switch (the "counter ±" equivalent from the template) ── */}
      <div
        className={cn(
          'flex w-full p-1 rounded-xl',
          'bg-white/[0.06] border border-white/[0.08]',
        )}
      >
        {(['signin', 'signup'] as Mode[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => handleModeSwitch(tab)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all',
              mode === tab
                ? 'bg-[#0071e3] text-white shadow-md'
                : 'text-[#6e6e73] hover:text-white',
            )}
          >
            {tab === 'signin' ? (
              <><LogIn size={15} strokeWidth={2} /> Sign In</>
            ) : (
              <><UserPlus size={15} strokeWidth={2} /> Sign Up</>
            )}
          </button>
        ))}
      </div>

      {/* ── Error ───────────────────────────────────────────────────── */}
      {error && (
        <div
          className={cn(
            'w-full flex items-start gap-2 px-4 py-3 rounded-xl text-sm',
            'bg-red-500/10 border border-red-500/20 text-red-400',
          )}
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" strokeWidth={2} />
          {error}
        </div>
      )}

      {/* ── Form ────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="w-full space-y-4">
        {/* Username */}
        <div>
          <label
            htmlFor="username"
            className="block text-[11px] font-semibold uppercase tracking-wider text-[#6e6e73] mb-1.5"
          >
            Username
          </label>
          <div className="relative">
            <User
              size={15}
              strokeWidth={1.5}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6e6e73] pointer-events-none"
            />
            <input
              id="username"
              name="username"
              type="text"
              value={form.username}
              onChange={handleChange}
              placeholder="admin"
              required
              disabled={loading}
              autoComplete="username"
              className={cn(
                'w-full bg-black/40 border border-white/10 rounded-xl',
                'pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-[#6e6e73]',
                'focus:outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3]',
                'transition-colors disabled:opacity-50',
              )}
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="password"
            className="block text-[11px] font-semibold uppercase tracking-wider text-[#6e6e73] mb-1.5"
          >
            Password
          </label>
          <div className="relative">
            <Lock
              size={15}
              strokeWidth={1.5}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6e6e73] pointer-events-none"
            />
            <input
              id="password"
              name="password"
              type={showPass ? 'text' : 'password'}
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              disabled={loading}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              className={cn(
                'w-full bg-black/40 border border-white/10 rounded-xl',
                'pl-10 pr-10 py-2.5 text-sm text-white placeholder:text-[#6e6e73]',
                'focus:outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3]',
                'transition-colors disabled:opacity-50',
              )}
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6e6e73] hover:text-white transition-colors"
              tabIndex={-1}
              aria-label={showPass ? 'Hide password' : 'Show password'}
            >
              {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {/* Confirm Password — Sign Up only */}
        {mode === 'signup' && (
          <div>
            <label
              htmlFor="confirm"
              className="block text-[11px] font-semibold uppercase tracking-wider text-[#6e6e73] mb-1.5"
            >
              Confirm Password
            </label>
            <div className="relative">
              <Lock
                size={15}
                strokeWidth={1.5}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6e6e73] pointer-events-none"
              />
              <input
                id="confirm"
                name="confirm"
                type={showPass ? 'text' : 'password'}
                value={form.confirm}
                onChange={handleChange}
                placeholder="••••••••"
                required={mode === 'signup'}
                disabled={loading}
                autoComplete="new-password"
                className={cn(
                  'w-full bg-black/40 border border-white/10 rounded-xl',
                  'pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-[#6e6e73]',
                  'focus:outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3]',
                  'transition-colors disabled:opacity-50',
                )}
              />
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !form.username || !form.password}
          className={cn(
            'w-full flex items-center justify-center gap-2 mt-2',
            'bg-[#0071e3] hover:brightness-110 text-white',
            'font-semibold text-sm rounded-xl py-3',
            'transition-all disabled:opacity-40 disabled:cursor-not-allowed',
          )}
        >
          {loading ? (
            <><Loader2 size={16} className="animate-spin" /> {mode === 'signin' ? 'Signing in…' : 'Creating account…'}</>
          ) : (
            <>{mode === 'signin' ? <LogIn size={16} /> : <UserPlus size={16} />}
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
            <ArrowRight size={14} strokeWidth={2.5} /></>
          )}
        </button>
      </form>

      {/* ── Footer hint ──────────────────────────────────────────────── */}
      <p className="text-[#3a3a3c] text-xs text-center">
        {mode === 'signin' ? (
          <>No account?{' '}
            <button
              type="button"
              onClick={() => handleModeSwitch('signup')}
              className="text-[#0071e3] hover:underline font-medium"
            >
              Sign up
            </button>
          </>
        ) : (
          <>Already have one?{' '}
            <button
              type="button"
              onClick={() => handleModeSwitch('signin')}
              className="text-[#0071e3] hover:underline font-medium"
            >
              Sign in
            </button>
          </>
        )}
      </p>
    </div>
  );
};

// Default export so `import AuthSwitch from './auth-switch'` works (matches demo.tsx)
export default Component;
