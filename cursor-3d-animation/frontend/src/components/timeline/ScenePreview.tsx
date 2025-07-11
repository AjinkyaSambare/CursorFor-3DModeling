import { useState, useRef, useEffect } from 'react';
import { Film, Clock, Eye } from 'lucide-react';
import { sceneApi } from '../../services/api';

// Inline types
interface Scene {
  id: string;
  prompt: string;
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

interface ScenePreviewProps {
  scenes: Scene[];
  currentTime: number;
  selectedSceneId: string | null;
  onSceneSelect: (sceneId: string | null) => void;
}

export default function ScenePreview({
  scenes,
  currentTime,
  selectedSceneId,
  onSceneSelect,
}: ScenePreviewProps) {
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Find which scene should be playing at current time
  const getCurrentScene = () => {
    let accumulatedTime = 0;
    for (const scene of scenes) {
      if (currentTime >= accumulatedTime && currentTime < accumulatedTime + scene.duration) {
        return { scene, sceneTime: currentTime - accumulatedTime };
      }
      accumulatedTime += scene.duration;
    }
    return null;
  };

  const currentSceneInfo = getCurrentScene();
  const selectedScene = scenes.find(s => s.id === selectedSceneId);
  const displayScene = selectedScene || currentSceneInfo?.scene;

  // Update preview video when scene changes
  useEffect(() => {
    if (displayScene?.video_path) {
      const videoUrl = sceneApi.getVideoUrl(displayScene.id);
      setPreviewVideoUrl(videoUrl);
    } else {
      setPreviewVideoUrl(null);
    }
  }, [displayScene?.id]);

  // Sync video time with timeline
  useEffect(() => {
    if (videoRef.current && currentSceneInfo && !selectedScene) {
      const video = videoRef.current;
      const targetTime = currentSceneInfo.sceneTime;
      
      if (Math.abs(video.currentTime - targetTime) > 0.5) {
        video.currentTime = targetTime;
      }
    }
  }, [currentSceneInfo, selectedScene]);

  return (
    <div className="h-full bg-gray-800 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-2">Scene Preview</h3>
        {displayScene ? (
          <div className="text-sm text-gray-300">
            <div className="font-medium truncate mb-1">{displayScene.prompt}</div>
            <div className="flex items-center space-x-4 text-xs">
              <span className="flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {displayScene.duration}s
              </span>
              <span className="flex items-center">
                <Eye className="w-3 h-3 mr-1" />
                {displayScene.resolution}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500">No scene selected</div>
        )}
      </div>

      {/* Video Preview */}
      <div className="flex-1 flex items-center justify-center p-4">
        {previewVideoUrl ? (
          <div className="w-full">
            <video
              ref={videoRef}
              src={previewVideoUrl}
              className="w-full h-auto rounded-lg bg-black"
              controls
              muted
              preload="metadata"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-500 space-y-3">
            <Film className="w-16 h-16" />
            <p className="text-sm text-center">
              {displayScene ? 'Video not available' : 'Select a scene to preview'}
            </p>
          </div>
        )}
      </div>

      {/* Scene Properties */}
      {displayScene && (
        <div className="p-4 border-t border-gray-700 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Scene Status
            </label>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                displayScene.status === 'completed' ? 'bg-green-500' :
                displayScene.status === 'failed' ? 'bg-red-500' :
                'bg-yellow-500'
              }`} />
              <span className="text-sm text-white capitalize">
                {displayScene.status.replace('_', ' ')}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Library
            </label>
            <span className="text-sm text-white uppercase">
              {displayScene.library}
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Created
            </label>
            <span className="text-sm text-white">
              {new Date(displayScene.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          {currentSceneInfo && !selectedScene && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Timeline Position
              </label>
              <span className="text-sm text-white">
                {Math.round(currentSceneInfo.sceneTime * 10) / 10}s / {displayScene.duration}s
              </span>
            </div>
          )}
        </div>
      )}

      {/* Scene List */}
      <div className="border-t border-gray-700 max-h-48 overflow-y-auto">
        <div className="p-3">
          <h4 className="text-sm font-medium text-gray-400 mb-2">All Scenes</h4>
          <div className="space-y-1">
            {scenes.map((scene, index) => {
              const isActive = currentSceneInfo?.scene.id === scene.id && !selectedScene;
              const isSelected = selectedSceneId === scene.id;
              
              return (
                <button
                  key={scene.id}
                  onClick={() => onSceneSelect(isSelected ? null : scene.id)}
                  className={`w-full text-left p-2 rounded text-xs transition-colors ${
                    isSelected 
                      ? 'bg-blue-600 text-white' 
                      : isActive 
                        ? 'bg-gray-700 text-white' 
                        : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate font-medium">
                      {index + 1}. {scene.prompt}
                    </span>
                    <span className="ml-2 text-gray-400">
                      {scene.duration}s
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}