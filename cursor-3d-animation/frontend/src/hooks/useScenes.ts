import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sceneApi } from '../services/api';
import toast from 'react-hot-toast';

// Inline types
interface SceneRequest {
  prompt: string;
  library?: string;
  duration?: number;
  resolution?: string;
  style?: Record<string, any>;
  use_enhanced_prompt?: boolean;
}

interface Scene {
  id: string;
  prompt: string;
  original_prompt?: string;
  library: string;
  duration: number;
  resolution: string;
  status: string;
  generated_code?: string;
  video_path?: string;
  thumbnail_path?: string;
  metadata: Record<string, any>;
  error?: string;
  created_at: string;
  updated_at: string;
}

export const useScenes = (page = 1, pageSize = 20) => {
  return useQuery({
    queryKey: ['scenes', page, pageSize],
    queryFn: () => sceneApi.list(page, pageSize),
  });
};

export const useScene = (sceneId: string, enabled = true) => {
  return useQuery({
    queryKey: ['scene', sceneId],
    queryFn: () => sceneApi.get(sceneId),
    enabled: enabled && !!sceneId,
    refetchInterval: (data) => {
      if (!data) return false;
      const status = data.status;
      // Keep polling while processing
      if (status === 'pending' || status === 'processing' || 
          status === 'generating_code' || status === 'rendering') {
        return 2000; // Poll every 2 seconds
      }
      return false;
    },
  });
};

export const useCreateScene = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (request: SceneRequest) => sceneApi.create(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenes'] });
      toast.success('Scene generation started!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create scene');
    },
  });
};

export const useDeleteScene = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (sceneId: string) => sceneApi.delete(sceneId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenes'] });
      toast.success('Scene deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete scene');
    },
  });
};

export const useRegenerateScene = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (sceneId: string) => sceneApi.regenerate(sceneId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['scene', data.id] });
      queryClient.invalidateQueries({ queryKey: ['scenes'] });
      toast.success('Scene regeneration started!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to regenerate scene');
    },
  });
};