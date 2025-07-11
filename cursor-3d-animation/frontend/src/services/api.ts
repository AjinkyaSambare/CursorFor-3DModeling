import axios from 'axios';

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
});

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