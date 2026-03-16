import Link from 'next/link';

export default function NotFound(): JSX.Element {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="max-w-md text-center">
        <div className="text-8xl font-bold text-primary mb-4">404</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Page not found</h1>
        <p className="text-gray-600 mb-6">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="space-y-3">
          <Link href="/dashboard" className="btn-primary w-full inline-block">
            Back to Dashboard
          </Link>
          <Link href="/" className="btn-secondary w-full inline-block">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}