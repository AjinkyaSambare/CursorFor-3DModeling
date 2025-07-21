import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { UserCircleIcon, CalendarIcon, EnvelopeIcon } from '@heroicons/react/24/outline'

export default function UserProfile() {
  const { user } = useAuth()

  const getInitials = () => {
    const name = user?.email?.split('@')[0] || 'U'
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2)
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">User Profile</h1>
        <p className="mt-2 text-gray-600">
          View your account information
        </p>
      </div>

      {/* User Info Card */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <div className="flex items-center space-x-6">
          <div className="h-24 w-24 rounded-full bg-blue-600 flex items-center justify-center">
            <span className="text-2xl font-bold text-white">
              {getInitials()}
            </span>
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {user?.email?.split('@')[0] || 'User'}
            </h2>
            <p className="text-gray-600 flex items-center gap-2 mt-1">
              <EnvelopeIcon className="h-4 w-4" />
              {user?.email}
            </p>
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Member since {formatDate(user?.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* Account Details */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email Address</label>
            <p className="mt-1 text-sm text-gray-900">
              {user?.email || 'N/A'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Account Created</label>
            <p className="mt-1 text-sm text-gray-900">
              {formatDate(user?.created_at)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email Verified</label>
            <p className="mt-1 text-sm text-gray-900">
              {user?.email_confirmed_at ? formatDate(user.email_confirmed_at) : 'Not verified'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Account Status</label>
            <span className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Active
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}