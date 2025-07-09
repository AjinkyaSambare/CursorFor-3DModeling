import axios from 'axios';
import { 
  SceneRequest, 
  SceneResponse, 
  SceneListResponse, 
  Project, 
  ProjectRequest 
} from '../types/index';

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