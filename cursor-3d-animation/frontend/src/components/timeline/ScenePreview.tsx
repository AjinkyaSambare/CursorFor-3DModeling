import { useState, useRef, useEffect } from 'react';
import { Film, Clock, Eye, AlertTriangle, CheckCircle } from 'lucide-react';
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
  const [videoHealth, setVideoHealth] = useState<{[key: string]: any}>({});
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
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
    const loadVideoWithAuth = async () => {
      if (displayScene?.video_path) {
        setIsLoadingVideo(true);
        setVideoError(null);
        setPreviewVideoUrl(null);
        
        try {
          console.log(`Loading video for scene ${displayScene.id}`);
          
          // Use authenticated blob URL approach
          const authenticatedVideoUrl = await sceneApi.getAuthenticatedVideoUrl(displayScene.id);
          setPreviewVideoUrl(authenticatedVideoUrl);
          setVideoError(null);
          
          // Check video health
          checkVideoHealth(displayScene.id);
        } catch (error) {
          console.error(`Failed to load video for scene ${displayScene.id}:`, error);
          setPreviewVideoUrl(null);
          setVideoError(`Failed to load video: ${error instanceof Error ? error.message : 'Unknown error'}`);
          // Still check health to get proper error message
          checkVideoHealth(displayScene.id);
        } finally {
          setIsLoadingVideo(false);
        }
      } else {
        setPreviewVideoUrl(null);
        setVideoError(null);
        setIsLoadingVideo(false);
      }
    };

    loadVideoWithAuth();
  }, [displayScene?.id]);

  const checkVideoHealth = async (sceneId: string) => {
    try {
      const health = await sceneApi.checkHealth(sceneId);
      setVideoHealth(prev => ({
        ...prev,
        [sceneId]: health
      }));
    } catch (error) {
      setVideoHealth(prev => ({
        ...prev,
        [sceneId]: { valid: false, status: 'error', message: 'Health check failed' }
      }));
    }
  };

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
              {videoHealth[displayScene.id] && (
                <span className="flex items-center">
                  {videoHealth[displayScene.id].valid ? (
                    <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 mr-1 text-red-500" />
                  )}
                  <span className={videoHealth[displayScene.id].valid ? 'text-green-400' : 'text-red-400'}>
                    {videoHealth[displayScene.id].valid ? 'Valid' : 'Invalid'}
                  </span>
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500">No scene selected</div>
        )}
      </div>

      {/* Video Preview */}
      <div className="flex-1 flex items-center justify-center p-4">
        {isLoadingVideo ? (
          <div className="flex flex-col items-center justify-center text-gray-500 space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
            <p className="text-sm text-center">Loading video...</p>
          </div>
        ) : previewVideoUrl ? (
          <div className="w-full">
            <video
              ref={videoRef}
              src={previewVideoUrl}
              className="w-full h-auto rounded-lg bg-black"
              controls
              muted
              preload="metadata"
              onError={(e) => {
                console.error('Video playback error:', e);
                setVideoError('Video playback failed');
              }}
              onLoadStart={() => console.log('Video loading started')}
              onCanPlay={() => console.log('Video can play')}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-500 space-y-3">
            <Film className="w-16 h-16" />
            <p className="text-sm text-center">
              {displayScene ? (
                displayScene.status === 'completed' ? 
                  'Video not available' : 
                  `Scene is ${displayScene.status.replace('_', ' ')}`
              ) : 'Select a scene to preview'}
            </p>
            
            {/* Show video error if any */}
            {videoError && (
              <div className="text-xs text-red-400 text-center bg-red-900/20 px-3 py-1 rounded max-w-full">
                ⚠️ {videoError}
              </div>
            )}
            
            {displayScene && displayScene.status !== 'completed' && (
              <div className="text-xs text-gray-400 text-center">
                {displayScene.status === 'processing' && 'Scene is being processed...'}
                {displayScene.status === 'failed' && 'Scene generation failed'}
                {displayScene.status === 'generating_code' && 'Generating animation code...'}
                {displayScene.status === 'rendering' && 'Rendering video...'}
              </div>
            )}
            {displayScene && videoHealth[displayScene.id] && !videoHealth[displayScene.id].valid && (
              <div className="text-xs text-red-400 text-center bg-red-900/20 px-3 py-1 rounded">
                ⚠️ {videoHealth[displayScene.id].message}
              </div>
            )}
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
                    <div className="flex items-center flex-1 min-w-0">
                      <span className="truncate font-medium flex-1">
                        {index + 1}. {scene.prompt}
                      </span>
                      {videoHealth[scene.id] && !videoHealth[scene.id].valid && (
                        <AlertTriangle className="w-3 h-3 ml-1 text-red-400 flex-shrink-0" />
                      )}
                      {scene.status !== 'completed' && (
                        <div className={`w-2 h-2 rounded-full ml-1 flex-shrink-0 ${
                          scene.status === 'failed' ? 'bg-red-500' :
                          scene.status === 'processing' || scene.status === 'rendering' ? 'bg-yellow-500 animate-pulse' :
                          'bg-gray-500'
                        }`} />
                      )}
                    </div>
                    <span className="ml-2 text-gray-400 flex-shrink-0">
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