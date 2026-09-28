'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  FileText, 
  Package, 
  Users, 
  BarChart2, 
  Settings, 
  Menu, 
  X, 
  AppWindow
} from 'lucide-react';
import AuthSwitch from '@/components/ui/auth-switch';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const navItems: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
    { label: 'Invoices', path: '/invoices', icon: <FileText size={20} /> },
    { label: 'Products', path: '/products', icon: <Package size={20} /> },
    { label: 'Customers', path: '/customers', icon: <Users size={20} /> },
    { label: 'Reports', path: '/reports', icon: <BarChart2 size={20} /> },
    { label: 'Settings', path: '/settings', icon: <Settings size={20} /> },
  ];

  const isActive = useCallback((path: string): boolean => pathname === path, [pathname]);

  const handleMobileMenuClick = useCallback((path: string) => {
    setMobileMenuOpen(false);
    router.push(path);
  }, [router]);

  return (
    <nav className="bg-gradient-to-r from-primary to-primary-dark text-white sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link
            href="/dashboard"
            className="flex items-center space-x-2 font-bold text-xl hover:opacity-80 transition-opacity"
          >
            <AppWindow className="w-8 h-8" />
            <span className="hidden sm:inline">Invoice Manager</span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`px-3 py-2 rounded-lg transition-colors flex items-center space-x-1 ${
                  isActive(item.path)
                    ? 'bg-white text-primary font-semibold'
                    : 'hover:bg-white/10'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          {/* Desktop — AuthSwitch (signed-in pill or Sign In button) */}
          <div className="hidden md:flex items-center">
            <AuthSwitch />
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Toggle mobile menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-2 border-t border-white/20 pt-3">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => handleMobileMenuClick(item.path)}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                  isActive(item.path)
                    ? 'bg-white text-primary font-semibold'
                    : 'hover:bg-white/10'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}

            {/* Mobile — AuthSwitch replaces old manual sign-out block */}
            <div className="border-t border-white/20 pt-3 mt-1 px-2">
              <AuthSwitch />
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;