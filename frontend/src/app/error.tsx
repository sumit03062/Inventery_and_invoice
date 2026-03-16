'use client';

import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps): JSX.Element {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="max-w-md text-center">
        <div className="text-6xl font-bold text-danger mb-4">⚠️</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Something went wrong!</h1>
        <p className="text-gray-600 mb-6">
          {error.message ||
            'An unexpected error occurred. Our team has been notified.'}
        </p>
        <div className="space-y-3">
          <button onClick={reset} className="btn-primary w-full">
            Try Again
          </button>
          <a href="/dashboard" className="btn-secondary w-full inline-block">
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}