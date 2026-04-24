import { Link, useLocation } from 'react-router-dom';
import { PawPrint, Map, PlusCircle, Search, Menu, X } from 'lucide-react';
import { useState } from 'react';
import React from 'react';
import clsx from 'clsx';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { name: 'Mapa', path: '/', icon: Map },
    { name: 'Galería', path: '/gallery', icon: PawPrint },
    { name: 'Dashboard', path: '/dashboard', icon: Search },
    { name: 'Similitudes', path: '/similarities', icon: Search },
    { name: 'Reportar Extravío', path: '/report/lost', icon: PawPrint },
    { name: 'Reportar Avistamiento', path: '/report/sighted', icon: PlusCircle },
    { name: 'Reportar por Captura', path: '/report/screenshot', icon: Search },
  ];

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans">
      <nav className="bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex-shrink-0 flex items-center gap-2">
                <PawPrint className="h-8 w-8 text-orange-500" />
                <span className="font-display font-bold text-xl tracking-tight text-stone-900">
                  Peekeños
                </span>
              </Link>
            </div>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex md:items-center md:space-x-8">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={clsx(
                      'inline-flex items-center px-1 pt-1 text-sm font-medium transition-colors duration-200',
                      isActive
                        ? 'text-orange-600 border-b-2 border-orange-500'
                        : 'text-stone-500 hover:text-stone-900 hover:border-b-2 hover:border-stone-300'
                    )}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.name}
                  </Link>
                );
              })}
            </div>

            {/* Mobile Menu Button */}
            <div className="flex items-center md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-stone-400 hover:text-stone-500 hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange-500"
              >
                {isMenuOpen ? (
                  <X className="block h-6 w-6" aria-hidden="true" />
                ) : (
                  <Menu className="block h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-b border-stone-200">
            <div className="pt-2 pb-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMenuOpen(false)}
                    className={clsx(
                      'block pl-3 pr-4 py-2 border-l-4 text-base font-medium',
                      isActive
                        ? 'bg-orange-50 border-orange-500 text-orange-700'
                        : 'border-transparent text-stone-500 hover:bg-stone-50 hover:border-stone-300 hover:text-stone-700'
                    )}
                  >
                    <div className="flex items-center">
                      <Icon className="w-5 h-5 mr-3" />
                      {item.name}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
