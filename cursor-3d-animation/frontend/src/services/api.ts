import axios from 'axios';
import { supabase } from '../lib/supabase';

// Temporary inline types to fix import issue
interface SceneRequest {
  prompt: string;
  library?: string;
  duration?: number;
  resolution?: string;
  style?: Record<string, any>;
  use_enhanced_prompt?: boolean;
}

interface SceneResponse {
  id: string;
  status: string;
  message: string;
  video_url?: string;
  code?: string;
  error?: string;
  original_prompt?: string;
  enhanced_prompt?: string;
}

interface SceneListResponse {
  scenes: any[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  scenes: string[];
  timeline: any[];
  created_at: string;
  updated_at: string;
}

interface ProjectRequest {
  name: string;
  description?: string;
  scenes?: string[];
}

interface ExportRequest {
  project_id?: string;
  scene_ids?: string[];
  format?: 'mp4' | 'webm';
  resolution?: '720p' | '1080p' | '4K';
  include_transitions?: boolean;
  transition_duration?: number;
}

interface ExportResponse {
  export_id: string;
  status: string;
  message: string;
}

interface ExportStatus {
  export_id: string;
  status: 'pending' | 'processing' | 'combining' | 'finalizing' | 'completed' | 'failed';
  progress: number;
  error_message?: string;
  created_at: string;
  completed_at?: string;
  download_url?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Add auth interceptor to include JWT token in requests
api.interceptors.request.use(
  async (config) => {
    try {
      console.log('[API] 📤 Making request to:', config.url);
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('[API] ❌ Session error:', error);
        return config;
      }
      
      if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
        console.log('[API] 🔑 Token added for:', config.url);
      } else {
        console.log('[API] ⚠️ No token available for:', config.url);
      }
      
      return config;
    } catch (error) {
      console.error('[API] ❌ Request interceptor failed:', error);
      return config;
    }
  },
  (error) => {
    console.error('[API] ❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => {
    console.log('[API] ✅ Success:', response.config.url, response.status);
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url;
    
    console.log(`[API] ❌ Error: ${url} - ${status} ${error.response?.statusText || error.message}`);
    
    if (status === 401) {
      console.warn('[API] 🔐 Unauthorized - token may be invalid');
    }
    
    return Promise.reject(error);
  }
);

// Scene API
export const sceneApi = {
  create: async (request: SceneRequest): Promise<SceneResponse> => {
    const { data } = await api.post('/scenes/', request);
    return data;
  },

  get: async (sceneId: string): Promise<SceneResponse> => {
    const { data } = await api.get(`/scenes/${sceneId}`);
    return data;
  },

  list: async (page = 1, pageSize = 20): Promise<SceneListResponse> => {
    const { data } = await api.get('/scenes/', {
      params: { page, page_size: pageSize }
    });
    return data;
  },

  delete: async (sceneId: string): Promise<void> => {
    await api.delete(`/scenes/${sceneId}`);
  },

  regenerate: async (sceneId: string): Promise<SceneResponse> => {
    const { data } = await api.post(`/scenes/${sceneId}/regenerate`);
    return data;
  },

  getVideoUrl: (sceneId: string): string => {
    return `${API_BASE_URL}/api/v1/scenes/${sceneId}/video`;
  },

  getVideoBlob: async (sceneId: string): Promise<string> => {
    try {
      const response = await api.get(`/scenes/${sceneId}/video`, {
        responseType: 'blob',
        timeout: 30000, // 30 second timeout for video loading
      });
      return URL.createObjectURL(response.data);
    } catch (error) {
      console.error(`[API] Failed to get video blob for scene ${sceneId}:`, error);
      throw error;
    }
  },

  // New method for getting authenticated video URL using blob approach
  getAuthenticatedVideoUrl: async (sceneId: string): Promise<string> => {
    try {
      console.log(`[API] Getting authenticated video URL for scene ${sceneId}`);
      return await sceneApi.getVideoBlob(sceneId);
    } catch (error) {
      console.error(`[API] Failed to get authenticated video URL for scene ${sceneId}:`, error);
      throw error;
    }
  },

  getCode: async (sceneId: string): Promise<any> => {
    const { data } = await api.get(`/scenes/${sceneId}/code`);
    return data;
  },

  checkHealth: async (sceneId: string): Promise<any> => {
    const { data } = await api.get(`/scenes/${sceneId}/health`);
    return data;
  }
};

// Project API
export const projectApi = {
  create: async (request: ProjectRequest): Promise<Project> => {
    const { data } = await api.post('/projects/', request);
    return data;
  },

  get: async (projectId: string): Promise<Project> => {
    const { data } = await api.get(`/projects/${projectId}`);
    return data;
  },

  list: async (): Promise<Project[]> => {
    const { data } = await api.get('/projects/');
    return data;
  },

  update: async (projectId: string, request: ProjectRequest): Promise<Project> => {
    const { data } = await api.put(`/projects/${projectId}`, request);
    return data;
  },

  delete: async (projectId: string): Promise<void> => {
    await api.delete(`/projects/${projectId}`);
  },

  addScene: async (projectId: string, sceneId: string): Promise<Project> => {
    const { data } = await api.post(`/projects/${projectId}/add-scene/${sceneId}`);
    return data;
  },

  removeScene: async (projectId: string, sceneId: string): Promise<Project> => {
    const { data } = await api.post(`/projects/${projectId}/remove-scene/${sceneId}`);
    return data;
  },

  reorderScenes: async (projectId: string, sceneIds: string[]): Promise<Project> => {
    const { data } = await api.post(`/projects/${projectId}/reorder-scenes`, sceneIds);
    return data;
  },

  // Export functionality
  exportProject: async (request: ExportRequest): Promise<ExportResponse> => {
    const { data } = await api.post('/projects/export', request);
    return data;
  },

  getExportStatus: async (exportId: string): Promise<ExportStatus> => {
    const { data } = await api.get(`/projects/export/${exportId}/status`);
    return data;
  },

  downloadExport: async (exportId: string): Promise<Blob> => {
    const response = await api.get(`/projects/export/${exportId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  }
};

// Health API
export const healthApi = {
  check: async (): Promise<any> => {
    const { data } = await api.get('/health/');
    return data;
  },

  ready: async (): Promise<any> => {
    const { data } = await api.get('/health/ready');
    return data;
  }
};

// Profile interfaces
interface UserProfile {
  id: string;
  display_name?: string;
  avatar_url?: string;
  preferences: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface ProfileUpdateRequest {
  display_name?: string;
  preferences?: Record<string, any>;
}

interface AvatarUploadResponse {
  avatar_url: string;
  message: string;
}

// Auth API (for additional backend auth endpoints)
export const authApi = {
  getProfile: async (): Promise<UserProfile> => {
    const { data } = await api.get('/auth/profile');
    return data;
  },

  updateProfile: async (updates: ProfileUpdateRequest): Promise<UserProfile> => {
    const { data } = await api.put('/auth/profile', updates);
    return data;
  },

  deleteProfile: async (): Promise<{ message: string }> => {
    const { data } = await api.delete('/auth/profile');
    return data;
  },

  uploadAvatar: async (file: File): Promise<AvatarUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const { data } = await api.post('/auth/profile/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },

  getMe: async (): Promise<any> => {
    const { data } = await api.get('/auth/me');
    return data;
  }
};