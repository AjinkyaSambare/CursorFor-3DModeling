import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import AuthModal from './AuthModal'

interface ProtectedRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)

  // Debug logging for protected route behavior
  React.useEffect(() => {
    console.log('[ProtectedRoute] 🛡️ Route check:', {
      hasUser: !!user,
      userEmail: user?.email || 'No user',
      loading,
      timestamp: new Date().toISOString()
    });
  }, [user, loading]);

  if (loading) {
    console.log('[ProtectedRoute] ⏳ Showing loading state');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    console.log('[ProtectedRoute] 🚫 No user - showing auth required');
    
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full space-y-8 p-8">
            <div className="text-center">
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                Sign in required
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                You need to be signed in to access this page
              </p>
            </div>
            <div className="text-center">
              <button
                onClick={() => setShowAuthModal(true)}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Sign in to continue
              </button>
            </div>
          </div>
        </div>
        
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          initialMode="login"
        />
      </>
    )
  }

  console.log('[ProtectedRoute] ✅ User authenticated - rendering children');
  return <>{children}</>
}