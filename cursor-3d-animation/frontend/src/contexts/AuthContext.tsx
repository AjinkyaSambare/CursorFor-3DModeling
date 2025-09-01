import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

// Define types from Supabase response
type User = any
type Session = any
type AuthError = any

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, displayName?: string) => Promise<{ user: User | null; error: AuthError | null }>
  signIn: (email: string, password: string) => Promise<{ user: User | null; error: AuthError | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>
  validateSession: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    let isInitializing = true
    
    console.log('[Auth] 🔄 Initializing auth system...')
    
    // Simplified initialization
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!mounted) return
        
        console.log('[Auth] 📋 Initial session:', {
          hasSession: !!session,
          email: session?.user?.email || 'No session'
        })
        
        if (session?.user) {
          setSession(session)
          setUser(session.user)
        }
        
        setLoading(false)
        isInitializing = false
        console.log('[Auth] ✅ Auth initialization complete')
        
      } catch (error) {
        console.error('[Auth] ❌ Auth initialization error:', error)
        if (mounted) {
          setLoading(false)
          isInitializing = false
        }
      }
    }

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) {
        console.log('[Auth] 🚫 Component unmounted, ignoring:', event)
        return
      }
      
      // Skip processing during initialization to prevent race conditions
      if (isInitializing) {
        console.log('[Auth] ⏭️ Skipping event during initialization:', event)
        return
      }
      
      console.log('[Auth] 🔔 Auth event:', event, session?.user?.email || 'No user')
      
      setSession(session)
      setUser(session?.user ?? null)
      
      setLoading(false)
    })

    // Initialize after setting up listener
    initializeAuth()

    return () => {
      console.log('[Auth] 🧹 Cleaning up auth context')
      mounted = false
      subscription.unsubscribe()
    }
  }, [])


  const signUp = async (email: string, password: string, displayName?: string) => {
    console.log('[Auth] \ud83d\udd0b Starting signup for:', email)
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName || email.split('@')[0],
          },
        },
      })

      if (error) {
        console.error('[Auth] \u274c Signup error:', error)
        toast.error(error.message)
        return { user: null, error }
      }

      if (data.user) {
        console.log('[Auth] ✅ Signup successful:', data.user.email)
        toast.success('Registration successful! Welcome!')
        
        // Let the auth state change handler manage the session
        // Don't manually set state here to avoid race conditions
        
        return { user: data.user, error: null }
      }

      return { user: data.user, error }
    } catch (error) {
      console.error('[Auth] \u274c Signup failed:', error)
      toast.error('Registration failed. Please try again.')
      return { user: null, error: error as any }
    }
  }

  const signIn = async (email: string, password: string) => {
    console.log('[Auth] \ud83d\udd11 Starting sign in for:', email)
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('[Auth] \u274c Sign in error:', error)
        toast.error(error.message)
        return { user: null, error }
      } 
      
      if (data.user) {
        console.log('[Auth] \u2705 Sign in successful:', data.user.email)
        toast.success('Welcome back!')
        
        // Let the auth state change handler manage the session
        return { user: data.user, error: null }
      }

      return { user: data.user, error }
    } catch (error) {
      console.error('[Auth] \u274c Sign in failed:', error)
      toast.error('Sign in failed. Please try again.')
      return { user: null, error: error as any }
    }
  }

  const signOut = async () => {
    console.log('[Auth] \ud83d\udeaa Starting sign out')
    
    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('[Auth] \u274c Sign out error:', error)
        toast.error(error.message)
      } else {
        console.log('[Auth] \u2705 Sign out successful')
        toast.success('Signed out successfully')
        
        // Let the auth state change handler clear the state
        // Don't manually clear here to avoid race conditions
      }
    } catch (error) {
      console.error('[Auth] \u274c Sign out failed:', error)
      toast.error('Sign out failed. Please try again.')
    }
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Password reset email sent!')
    }

    return { error }
  }


  // Session validation and refresh
  const validateSession = async () => {
    try {
      console.log('[Auth] 🔍 Validating session...')
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('[Auth] ❌ Session validation error:', error)
        return false
      }
      
      if (!session) {
        console.log('[Auth] 🚫 No session found during validation - clearing state')
        setSession(null)
        setUser(null)
        return false
      }
      
      // Check if session is expired
      const now = Math.round(Date.now() / 1000)
      const expiresAt = session.expires_at || 0
      const timeUntilExpiry = expiresAt - now
      
      console.log('[Auth] 📊 Session validation details:', {
        hasSession: !!session,
        expiresAt: new Date(expiresAt * 1000).toISOString(),
        timeUntilExpiry: `${timeUntilExpiry} seconds`,
        isExpired: expiresAt < now
      })
      
      if (session.expires_at && session.expires_at < now) {
        console.log('[Auth] ⏰ Session expired, attempting refresh')
        const { data: { session: refreshedSession }, error: refreshError } = 
          await supabase.auth.refreshSession()
        
        if (refreshError || !refreshedSession) {
          console.error('[Auth] ❌ Session refresh failed:', refreshError)
          setSession(null)
          setUser(null)
          return false
        }
        
        console.log('[Auth] ✅ Session refreshed successfully')
        setSession(refreshedSession)
        setUser(refreshedSession.user)
        return true
      }
      
      console.log('[Auth] ✅ Session is valid')
      return true
    } catch (error) {
      console.error('[Auth] ❌ Session validation failed:', error)
      return false
    }
  }

  // Removed periodic session validation to prevent race conditions
  // Supabase handles token refresh automatically

  const value: AuthContextType = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    validateSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider