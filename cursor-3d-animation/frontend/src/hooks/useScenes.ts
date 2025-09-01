import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sceneApi } from '../services/api';
import type { Scene } from '../types';
import toast from 'react-hot-toast';

// Inline types
interface SceneRequest {
  prompt: string;
  library?: string;
  duration?: number;
  resolution?: string;
  style?: Record<string, unknown>;
  use_enhanced_prompt?: boolean;
}

export const useScenes = (page = 1, pageSize = 20) => {
  return useQuery({
    queryKey: ['scenes', page, pageSize],
    queryFn: () => sceneApi.list(page, pageSize),
    staleTime: 1000 * 60 * 2, // 2 minutes for scenes list
    gcTime: 1000 * 60 * 5, // 5 minutes cache (was cacheTime in v4)
    retry: 3,
    refetchInterval: (data) => {
      // Smart polling based on scene statuses
      if (!data) return false;
      const sceneListResponse = data as unknown as { scenes: Scene[] };
      const scenes = sceneListResponse.scenes || [];
      const hasProcessingScenes = scenes.some((scene: Scene) => 
        ['pending', 'processing', 'generating_code', 'rendering'].includes(scene.status)
      );
      
      if (hasProcessingScenes) {
        return 3000; // Poll every 3 seconds when scenes are processing
      }
      
      return 30000; // Poll every 30 seconds to check for new scenes (reduced frequency)
    },
    refetchIntervalInBackground: false, // Don't poll in background to reduce load
    refetchOnWindowFocus: false, // Rely on cache instead of refetching on focus
    refetchOnMount: 'always', // Always refetch when component mounts
  });
};

export const useScene = (sceneId: string, enabled = true) => {
  return useQuery({
    queryKey: ['scene', sceneId],
    queryFn: () => sceneApi.get(sceneId),
    enabled: Boolean(enabled && sceneId),
    staleTime: 0, // Always consider data stale for processing scenes
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 1000; // Poll immediately if no data
      const status = data.status;
      // Keep polling while processing
      if (status === 'pending' || status === 'processing' || 
          status === 'generating_code' || status === 'rendering') {
        return 1000; // Poll every 1 second for better UX
      }
      // Continue polling for a few more times after completion to ensure video_url is populated
      if (status === 'completed' && !data.video_url) {
        return 2000; // Poll every 2 seconds when completed but no video_url yet
      }
      return false;
    },
    refetchIntervalInBackground: true, // Keep polling even when tab is not focused
    refetchOnWindowFocus: false, // Don't trigger extra refetch on focus
    refetchOnMount: true,
  });
};

// Hook for real-time scene status updates in scene cards
export const useSceneStatusUpdates = (scene?: Scene) => {
  const isValidScene = scene && scene.id && scene.status;
  const shouldUpdate = isValidScene && 
    ['pending', 'processing', 'generating_code', 'rendering'].includes(scene.status);
  
  return useQuery({
    queryKey: ['scene-status', scene?.id],
    queryFn: () => sceneApi.get(scene!.id),
    enabled: Boolean(shouldUpdate),
    refetchInterval: shouldUpdate ? 2000 : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
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