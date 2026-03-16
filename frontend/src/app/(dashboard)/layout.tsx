import Navbar from '@/components/Navbar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const currentYear = new Date().getFullYear();

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-lg mb-2">Invoice Manager</h3>
              <p className="text-gray-400 text-sm">
                Professional invoice management system for your business.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Features</h4>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>Invoice Management</li>
                <li>Product Tracking</li>
                <li>Sales Reports</li>
                <li>PDF Export</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Technology</h4>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>Next.js 14</li>
                <li>TypeScript</li>
                <li>Tailwind CSS</li>
                <li>Django API</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-6">
            <div className="text-center text-gray-400 text-sm">
              <p>&copy; {currentYear} Invoice Manager. All rights reserved.</p>
              <p className="mt-2">Built with Next.js, TypeScript & Tailwind CSS</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}