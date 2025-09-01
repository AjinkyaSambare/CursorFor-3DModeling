import { type ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sparkles, Film, Folder, Plus } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../contexts/AuthContext';
import UserDropdown from './auth/UserDropdown';
import AuthModal from './auth/AuthModal';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const navigation = [
    { name: 'Home', href: '/', icon: Sparkles, public: true },
    { name: 'Create', href: '/create', icon: Plus, public: false },
    { name: 'Scenes', href: '/scenes', icon: Film, public: false },
    { name: 'Projects', href: '/projects', icon: Folder, public: false },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900">
                  Cursor for 3D Animation
                </span>
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              {/* Navigation */}
              <nav className="flex space-x-1">
                {navigation
                  .filter(item => item.public || user)
                  .map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.href;
                    
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={clsx(
                          'flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-gray-900 text-white'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
              </nav>

              {/* Auth Section */}
              {user ? (
                <UserDropdown />
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Sign in
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="login"
      />
    </div>
  );
}