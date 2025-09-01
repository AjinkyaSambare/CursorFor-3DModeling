import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectApi } from '../services/api';

interface ProjectRequest {
  name: string;
  description?: string;
  scenes?: string[];
}

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: projectApi.list,
  });
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: ['projects', projectId],
    queryFn: () => projectApi.get(projectId),
    enabled: !!projectId,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: projectApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUpdateProject(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ProjectRequest) => projectApi.update(projectId, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: projectApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useAddSceneToProject(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sceneId: string) => projectApi.addScene(projectId, sceneId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
    },
  });
}

export function useRemoveSceneFromProject(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sceneId: string) => projectApi.removeScene(projectId, sceneId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
    },
  });
}

export function useReorderProjectScenes(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sceneIds: string[]) => projectApi.reorderScenes(projectId, sceneIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
    },
  });
}