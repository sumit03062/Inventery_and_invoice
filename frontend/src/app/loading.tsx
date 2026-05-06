'use client';

export default function Loading(): React.ReactNode {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="spinner mx-auto mb-4"></div>
        <h2 className="text-lg font-semibold text-gray-900">Loading...</h2>
        <p className="text-gray-600 mt-2">Please wait while we prepare your content.</p>
      </div>
    </div>
  );
}