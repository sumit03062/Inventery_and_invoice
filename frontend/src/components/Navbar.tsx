'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { NavItem } from '@/types';

const Navbar = () => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const navItems: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: '📊' },
    { label: 'Invoices', path: '/invoices', icon: '📄' },
    { label: 'Products', path: '/products', icon: '📦' },
    { label: 'Customers', path: '/customers', icon: '👥' },
    { label: 'Reports', path: '/reports', icon: '📈' },
    { label: 'Settings', path: '/settings', icon: '⚙️' },
  ];

  const isActive = useCallback((path: string): boolean => pathname === path, [pathname]);

  const handleLogout = useCallback(() => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
      router.push('/login');
    }
  }, [logout, router]);

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
            <svg
              className="w-8 h-8"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" />
            </svg>
            <span className="hidden sm:inline">Invoice Manager</span>
          </Link>

          {/* Desktop Menu */}
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

          {/* User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            {user && (
              <>
                <span className="text-sm font-medium">👤 {user.username}</span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors font-medium text-sm"
                  aria-label="Logout"
                >
                  Logout
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Toggle mobile menu"
            aria-expanded={mobileMenuOpen}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={mobileMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
              />
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-2 border-t border-white/20">
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
            <div className="border-t border-white/20 pt-2 mt-2">
              {user && (
                <>
                  <p className="px-4 py-2 text-sm font-medium">👤 {user.username}</p>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors font-medium text-sm"
                  >
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;