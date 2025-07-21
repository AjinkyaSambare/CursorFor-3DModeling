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
    refetchInterval: (data) => {
      // Smart polling based on scene statuses
      const scenes = data?.scenes || [];
      const hasProcessingScenes = scenes.some(scene => 
        ['pending', 'processing', 'generating_code', 'rendering'].includes(scene.status)
      );
      
      if (hasProcessingScenes) {
        return 3000; // Poll every 3 seconds when scenes are processing
      }
      
      return 15000; // Poll every 15 seconds to check for new scenes
    },
    refetchIntervalInBackground: true, // Keep polling for new scenes even in background
    refetchOnWindowFocus: true, // Refresh when user returns to tab
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
      // Continue polling for a few more times after completion to ensure video_url is populated
      if (status === 'completed' && !data.video_url) {
        return 3000; // Poll every 3 seconds when completed but no video_url yet
      }
      return false;
    },
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
};

// Hook for real-time scene status updates in scene cards
export const useSceneStatusUpdates = (scene: Scene) => {
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: ['scene-status', scene.id],
    queryFn: () => sceneApi.get(scene.id),
    enabled: ['pending', 'processing', 'generating_code', 'rendering'].includes(scene.status),
    refetchInterval: ['pending', 'processing', 'generating_code', 'rendering'].includes(scene.status) ? 2000 : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    onSuccess: (updatedSceneData) => {
      // Update the scenes list cache with the new status
      queryClient.setQueryData(['scenes'], (oldData: any) => {
        if (!oldData) return oldData;
        
        return {
          ...oldData,
          scenes: oldData.scenes.map((s: Scene) => 
            s.id === scene.id ? { ...s, ...updatedSceneData } : s
          )
        };
      });
      
      // Scene status updated in cache
    },
  });
};

export const useCreateScene = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (request: SceneRequest) => sceneApi.create(request),
    onSuccess: (data) => {
      // Invalidate scenes list to show new scene immediately
      queryClient.invalidateQueries({ queryKey: ['scenes'] });
      toast.success('Scene generation started! Watch the progress in the preview below.');
      // Scene created successfully
      
      // Return the scene data for navigation purposes
      return data;
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