import React, { useState } from 'react'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import LoginForm from './LoginForm'
import SignupForm from './SignupForm'
import ForgotPasswordForm from './ForgotPasswordForm'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  initialMode?: 'login' | 'signup' | 'forgot-password'
}

type AuthMode = 'login' | 'signup' | 'forgot-password'

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode)

  const handleClose = () => {
    onClose()
    // Reset to login mode when modal closes
    setTimeout(() => setMode('login'), 300)
  }

  const getTitle = () => {
    switch (mode) {
      case 'login':
        return 'Sign in to your account'
      case 'signup':
        return 'Create your account'
      case 'forgot-password':
        return 'Reset your password'
      default:
        return 'Authentication'
    }
  }

  const getContent = () => {
    switch (mode) {
      case 'login':
        return (
          <LoginForm
            onSuccess={handleClose}
            onSwitchToSignup={() => setMode('signup')}
            onSwitchToForgotPassword={() => setMode('forgot-password')}
          />
        )
      case 'signup':
        return (
          <SignupForm
            onSuccess={handleClose}
            onSwitchToLogin={() => setMode('login')}
          />
        )
      case 'forgot-password':
        return (
          <ForgotPasswordForm
            onSuccess={() => setMode('login')}
            onSwitchToLogin={() => setMode('login')}
          />
        )
      default:
        return null
    }
  }

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" aria-hidden="true" />

      {/* Full-screen container to center the panel */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="mx-auto max-w-md w-full bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <DialogTitle className="text-lg font-medium text-gray-900">
              {getTitle()}
            </DialogTitle>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-500 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {getContent()}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}