'use client';

import { useState, FormEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface LoginFormState {
  username: string;
  password: string;
  error: string | null;
  loading: boolean;
}

export default function LoginPage(): JSX.Element {
  const [formState, setFormState] = useState<LoginFormState>({
    username: '',
    password: '',
    error: null,
    loading: false,
  });

  const { login } = useAuth();
  const router = useRouter();

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setFormState((prev) => ({
      ...prev,
      [name]: value,
      error: null,
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    
    if (!formState.username.trim() || !formState.password.trim()) {
      setFormState((prev) => ({
        ...prev,
        error: 'Please enter username and password',
      }));
      return;
    }

    setFormState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const success = await login(formState.username, formState.password);
      if (success) {
        router.push('/dashboard');
      } else {
        setFormState((prev) => ({
          ...prev,
          error: 'Invalid username or password',
          loading: false,
          password: '',
        }));
      }
    } catch (error) {
      console.error('Login error:', error);
      setFormState((prev) => ({
        ...prev,
        error: 'Login failed. Please try again.',
        loading: false,
        password: '',
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary-light to-primary-dark flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-10 space-y-6">
          {/* Header Section */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-primary-dark rounded-full mb-4 shadow-lg">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-gray-900">Invoice Manager</h1>
            <p className="text-gray-600 mt-2 text-lg">Professional Invoice System</p>
            <p className="text-gray-500 mt-1 text-sm">Sign in to your account</p>
          </div>

          {/* Error Message */}
          {formState.error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-red-700 font-medium">{formState.error}</p>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username Field */}
            <div>
              <label htmlFor="username" className="form-label">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                  </svg>
                </div>
                <input
                  id="username"
                  type="text"
                  name="username"
                  value={formState.username}
                  onChange={handleInputChange}
                  className="input-field pl-10"
                  placeholder="Enter your username"
                  required
                  disabled={formState.loading}
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  id="password"
                  type="password"
                  name="password"
                  value={formState.password}
                  onChange={handleInputChange}
                  className="input-field pl-10"
                  placeholder="Enter your password"
                  required
                  disabled={formState.loading}
                  autoComplete="current-password"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={formState.loading || !formState.username || !formState.password}
              className="w-full btn-primary py-3 mt-6 font-semibold text-base flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {formState.loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3v-1" />
                  </svg>
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Demo Credentials</span>
            </div>
          </div>

          {/* Demo Credentials Info */}
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-5">
            <h3 className="text-sm font-bold text-blue-900 mb-3 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zm-11-1a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
              </svg>
              Test Account
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-blue-700 font-medium">Username:</span>
                <code className="text-xs bg-white px-3 py-1 rounded text-blue-900 font-mono border border-blue-200">admin</code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-blue-700 font-medium">Password:</span>
                <code className="text-xs bg-white px-3 py-1 rounded text-blue-900 font-mono border border-blue-200">password123</code>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-500">
            Protected by JWT Authentication • Built with Next.js
          </p>
        </div>

        {/* Background Decoration */}
        <div className="mt-8 text-center text-white/50 text-sm">
          <p>© 2024 Invoice Manager. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}