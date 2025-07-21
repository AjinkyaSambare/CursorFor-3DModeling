import React, { Fragment } from 'react'
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react'
import { 
  UserCircleIcon, 
  Cog6ToothIcon, 
  ArrowRightOnRectangleIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function UserDropdown() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  if (!user) return null

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const getDisplayName = () => {
    return profile?.display_name || user.email?.split('@')[0] || 'User'
  }

  const getInitials = () => {
    const name = getDisplayName()
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <Menu as="div" className="relative inline-block text-left">
      <div>
        <MenuButton className="inline-flex w-full justify-center items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
          {profile?.avatar_url ? (
            <img
              className="h-8 w-8 rounded-full"
              src={profile.avatar_url}
              alt={getDisplayName()}
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
              <span className="text-xs font-medium text-white">
                {getInitials()}
              </span>
            </div>
          )}
          <span className="hidden sm:block ml-2">{getDisplayName()}</span>
          <ChevronDownIcon className="-mr-1 h-5 w-5 text-gray-400" aria-hidden="true" />
        </MenuButton>
      </div>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <MenuItems className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            {/* User Info */}
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900">{getDisplayName()}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>

            {/* Profile Link */}
            <MenuItem>
              {({ active }) => (
                <button
                  onClick={() => navigate('/profile')}
                  className={`${
                    active ? 'bg-gray-100' : ''
                  } group flex w-full items-center px-4 py-2 text-sm text-gray-700`}
                >
                  <UserCircleIcon className="mr-3 h-5 w-5 text-gray-400" aria-hidden="true" />
                  Your Profile
                </button>
              )}
            </MenuItem>

            {/* Settings Link */}
            <MenuItem>
              {({ active }) => (
                <button
                  onClick={() => navigate('/settings')}
                  className={`${
                    active ? 'bg-gray-100' : ''
                  } group flex w-full items-center px-4 py-2 text-sm text-gray-700`}
                >
                  <Cog6ToothIcon className="mr-3 h-5 w-5 text-gray-400" aria-hidden="true" />
                  Settings
                </button>
              )}
            </MenuItem>

            {/* Divider */}
            <div className="border-t border-gray-100" />

            {/* Sign Out */}
            <MenuItem>
              {({ active }) => (
                <button
                  onClick={handleSignOut}
                  className={`${
                    active ? 'bg-gray-100' : ''
                  } group flex w-full items-center px-4 py-2 text-sm text-gray-700`}
                >
                  <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 text-gray-400" aria-hidden="true" />
                  Sign out
                </button>
              )}
            </MenuItem>
          </div>
        </MenuItems>
      </Transition>
    </Menu>
  )
}