// Shared type definitions for the application

import type { ErrorInfo, ReactNode } from 'react';

// Project types
export interface Project {
  id: string;
  name: string;
  description?: string;
  scenes: string[];
  timeline: TimelineItem[];
  created_at: string;
  updated_at: string;
}

export interface ProjectRequest {
  name: string;
  description?: string;
  scenes?: string[];
}

// Scene types
export interface Scene {
  id: string;
  prompt: string;
  library: string;
  duration: number;
  resolution: string;
  status: string; // Keep as string to match API response
  generated_code?: string;
  video_path?: string;
  thumbnail_path?: string;
  metadata: Record<string, unknown>;
  error?: string;
  created_at: string;
  updated_at: string;
  original_prompt?: string;
}

export type SceneStatus = 
  | 'pending'
  | 'processing'
  | 'generating_code'
  | 'rendering'
  | 'completed'
  | 'failed';

// Timeline types
export interface TimelineItem {
  id: string;
  sceneId: string;
  position: number;
  duration: number;
  transition?: TransitionType;
}

export interface TransitionType {
  type: string;
  duration: number;
  properties?: Record<string, unknown>;
}

// Error types
export interface ErrorBoundaryInfo {
  error: Error;
  errorInfo: ErrorInfo;
}

// Auth types
export interface User {
  id: string;
  email: string;
  name?: string;
  created_at: string;
}

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

// API types
export interface ApiResponse<T = unknown> {
  data: T;
  success: boolean;
  message?: string;
}

export interface ApiError {
  message: string;
  code?: string | number;
  details?: unknown;
}

// Export types
export interface ExportSettings {
  quality: 'low' | 'medium' | 'high' | 'ultra';
  format: 'mp4' | 'webm' | 'gif';
  resolution: '720p' | '1080p' | '4k';
}

// Component prop types
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children?: ReactNode;
}

export interface FormFieldProps {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  required?: boolean;
}