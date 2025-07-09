import { useState } from 'react';
import { Scene, SceneStatus } from '../types';
import { Play, Download, Trash2, RefreshCw, Clock, Film } from 'lucide-react';
import { sceneApi } from '../services/api';
import { useDeleteScene, useRegenerateScene } from '../hooks/useScenes';
import clsx from 'clsx';

interface SceneCardProps {
  scene: Scene;
}

export default function SceneCard({ scene }: SceneCardProps) {
  const [showVideo, setShowVideo] = useState(false);
  const deleteScene = useDeleteScene();
  const regenerateScene = useRegenerateScene();

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

  const handleDownload = () => {
    if (scene.video_path) {
      const link = document.createElement('a');
      link.href = sceneApi.getVideoUrl(scene.id);
      link.download = `animation_${scene.id}.mp4`;
      link.click();
    }
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this scene?')) {
      deleteScene.mutate(scene.id);
    }
  };

  const handleRegenerate = () => {
    regenerateScene.mutate(scene.id);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Thumbnail or Video */}
      <div className="aspect-video bg-gray-100 relative">
        {scene.status === SceneStatus.COMPLETED && scene.video_path ? (
          showVideo ? (
            <video
              controls
              autoPlay
              className="w-full h-full object-cover"
              src={sceneApi.getVideoUrl(scene.id)}
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors"
              onClick={() => setShowVideo(true)}
            >
              <Play className="w-12 h-12 text-gray-600" />
            </div>
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="w-12 h-12 text-gray-400" />
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
              statusColors[scene.status]
            )}
          >
            {scene.status.replace('_', ' ')}
          </span>
          <span className="text-xs text-gray-500 flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            {scene.duration}s
          </span>
        </div>

        {/* Prompt */}
        <p className="text-sm text-gray-700 mb-3 overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {scene.prompt}
        </p>

        {/* Meta Info */}
        <div className="text-xs text-gray-500 space-y-1">
          <div>{scene.library.toUpperCase()} • {scene.resolution}</div>
          <div>{formatDate(scene.created_at)}</div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          {scene.status === SceneStatus.COMPLETED && (
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
          
          {scene.status === SceneStatus.FAILED && (
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