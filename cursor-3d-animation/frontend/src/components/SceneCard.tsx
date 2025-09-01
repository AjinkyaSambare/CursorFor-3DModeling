import { useState, useEffect } from 'react';
import { Play, Download, Trash2, RefreshCw, Clock, Film } from 'lucide-react';
import { sceneApi } from '../services/api';
import { useDeleteScene, useRegenerateScene, useSceneStatusUpdates } from '../hooks/useScenes';
import type { Scene } from '../types';
import clsx from 'clsx';

const SceneStatus = {
  PENDING: "pending",
  PROCESSING: "processing",
  GENERATING_CODE: "generating_code",
  RENDERING: "rendering",
  COMPLETED: "completed",
  FAILED: "failed"
} as const;

interface SceneCardProps {
  scene: Scene; // Use Scene interface for type safety
}

export default function SceneCard({ scene }: SceneCardProps) {
  const [showVideo, setShowVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const deleteScene = useDeleteScene();
  const regenerateScene = useRegenerateScene();
  
  // Move hooks before conditional returns to follow Rules of Hooks
  const { data: updatedScene } = useSceneStatusUpdates(scene);
  
  // Add safety check for scene object after hooks
  if (!scene || !scene.id) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <p className="text-gray-500">Invalid scene data</p>
      </div>
    );
  }
  
  // Use updated scene data if available, otherwise use prop scene
  const currentScene = (updatedScene && typeof updatedScene === 'object' && 'id' in updatedScene ? updatedScene : scene) as Scene;

  const statusColors = {
    [SceneStatus.PENDING]: 'bg-gray-100 text-gray-700',
    [SceneStatus.PROCESSING]: 'bg-blue-100 text-blue-700',
    [SceneStatus.GENERATING_CODE]: 'bg-blue-100 text-blue-700',
    [SceneStatus.RENDERING]: 'bg-purple-100 text-purple-700',
    [SceneStatus.COMPLETED]: 'bg-green-100 text-green-700',
    [SceneStatus.FAILED]: 'bg-red-100 text-red-700',
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDownload = async () => {
    if (currentScene.video_path) {
      try {
        const blobUrl = await sceneApi.getVideoBlob(currentScene.id);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `animation_${currentScene.id}.mp4`;
        link.click();
        // Clean up the blob URL after download
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      } catch (error) {
        console.error('Failed to download video:', error);
      }
    }
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this scene?')) {
      deleteScene.mutate(currentScene.id);
    }
  };

  const handleRegenerate = () => {
    regenerateScene.mutate(currentScene.id);
  };

  const loadVideo = async () => {
    if (loadingVideo || videoUrl) return;
    
    setLoadingVideo(true);
    try {
      const blobUrl = await sceneApi.getVideoBlob(currentScene.id);
      setVideoUrl(blobUrl);
      setShowVideo(true);
    } catch (error) {
      console.error('Failed to load video:', error);
    } finally {
      setLoadingVideo(false);
    }
  };

  // Cleanup blob URL when component unmounts
  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Thumbnail or Video */}
      <div className="aspect-video bg-gray-100 relative">
        {currentScene.status === SceneStatus.COMPLETED && currentScene.video_path ? (
          showVideo && videoUrl ? (
            <video
              controls
              autoPlay
              className="w-full h-full object-cover"
              src={videoUrl}
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors"
              onClick={loadVideo}
            >
              {loadingVideo ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
              ) : (
                <Play className="w-12 h-12 text-gray-600" />
              )}
            </div>
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {['pending', 'processing', 'generating_code', 'rendering'].includes(currentScene.status) ? (
              <div className="flex flex-col items-center space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="text-xs text-gray-500 capitalize">
                  {currentScene.status.replace('_', ' ')}
                </span>
              </div>
            ) : (
              <Film className="w-12 h-12 text-gray-400" />
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Status Badge */}
        <div className="flex items-center justify-between mb-3">
          <span
            className={clsx(
              'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
              statusColors[currentScene.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-700',
              // Add pulsing animation for processing states
              currentScene.status && ['pending', 'processing', 'generating_code', 'rendering'].includes(currentScene.status) && 'animate-pulse'
            )}
          >
            {currentScene.status?.replace('_', ' ') || 'Unknown'}
          </span>
          <span className="text-xs text-gray-500 flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            {currentScene.duration || 0}s
          </span>
        </div>

        {/* Prompt */}
        <p className="text-sm text-gray-700 mb-3 overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {currentScene.original_prompt || currentScene.prompt || 'No prompt available'}
        </p>

        {/* Meta Info */}
        <div className="text-xs text-gray-500 space-y-1">
          <div>{(currentScene.library && typeof currentScene.library === 'string') ? currentScene.library.toUpperCase() : 'UNKNOWN'} • {currentScene.resolution || 'Unknown'}</div>
          <div>{currentScene.created_at ? formatDate(currentScene.created_at) : 'Unknown date'}</div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          {currentScene.status === SceneStatus.COMPLETED && (
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
          
          {currentScene.status === SceneStatus.FAILED && (
            <button
              onClick={handleRegenerate}
              disabled={regenerateScene.isPending}
              className="flex-1 flex items-center justify-center px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          
          <button
            onClick={handleDelete}
            disabled={deleteScene.isPending}
            className="flex items-center justify-center px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}