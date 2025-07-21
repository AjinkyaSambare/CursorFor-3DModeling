import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader2, Download, Code2, RefreshCw, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Inline types
interface SceneResponse {
  id: string;
  status: string;
  message: string;
  video_url?: string;
  code?: string;
  error?: string;
}

const SceneStatus = {
  PENDING: "pending",
  PROCESSING: "processing",
  GENERATING_CODE: "generating_code",
  RENDERING: "rendering",
  COMPLETED: "completed",
  FAILED: "failed"
} as const;
import { sceneApi } from '../services/api';
import { useRegenerateScene } from '../hooks/useScenes';
import CodeViewer from './CodeViewer';

interface ScenePreviewProps {
  scene: SceneResponse;
  isLoading: boolean;
  onComplete?: () => void;
}

// Video Player component with authenticated blob URL
function VideoPlayer({ sceneId, scene }: { sceneId: string; scene: SceneResponse }) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);

  const loadVideoWithRetry = async (attempt = 1) => {
    if (hasAttemptedLoad && videoUrl) {
      console.log(`[VideoPlayer] Video already loaded, skipping`);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setHasAttemptedLoad(true);
      console.log(`[VideoPlayer] Loading video for scene ${sceneId}, attempt ${attempt}`);
      const blobUrl = await sceneApi.getAuthenticatedVideoUrl(sceneId);
      setVideoUrl(blobUrl);
      setLoading(false);
      console.log(`[VideoPlayer] Video loaded successfully for scene ${sceneId}`);
    } catch (err) {
      console.error(`[VideoPlayer] Video load attempt ${attempt} failed:`, err);
      if (attempt < 3 && scene.status === 'completed') {
        console.log(`[VideoPlayer] Retrying video load in ${attempt} seconds...`);
        setLoading(false);
        setTimeout(() => loadVideoWithRetry(attempt + 1), 1000 * attempt);
      } else {
        setError(`Failed to load video after ${attempt} attempts`);
        setLoading(false);
        setHasAttemptedLoad(false); // Reset so user can try again
      }
    }
  };

  useEffect(() => {
    console.log(`[VideoPlayer] Scene updated - Status: ${scene.status}, Video URL exists: ${!!scene.video_url}, Current videoUrl: ${!!videoUrl}, Loading: ${loading}, HasAttempted: ${hasAttemptedLoad}`);
    
    // Only attempt to load video when scene is completed and has video_url
    if (scene.status === 'completed' && scene.video_url && !videoUrl && !loading && !hasAttemptedLoad) {
      console.log(`[VideoPlayer] Scene completed with video URL, loading video...`);
      loadVideoWithRetry();
    }
  }, [scene.status, scene.video_url, sceneId, videoUrl, loading, hasAttemptedLoad]);

  // Separate useEffect for cleanup
  useEffect(() => {
    return () => {
      if (videoUrl) {
        console.log(`[VideoPlayer] Cleaning up video URL on unmount`);
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="w-full aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
      </div>
    );
  }

  if (error || !videoUrl) {
    return (
      <div className="w-full aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">{error || 'Video not available'}</p>
      </div>
    );
  }

  return (
    <video
      controls
      className="w-full rounded-lg shadow-md"
      src={videoUrl}
      onError={() => setError('Video playback failed')}
    />
  );
}

export default function ScenePreview({ scene, isLoading, onComplete }: ScenePreviewProps) {
  const [showCode, setShowCode] = useState(false);
  const regenerateScene = useRegenerateScene();
  const navigate = useNavigate();

  const getStatusIcon = () => {
    switch (scene.status) {
      case SceneStatus.COMPLETED:
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case SceneStatus.FAILED:
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    }
  };

  const getStatusText = () => {
    switch (scene.status) {
      case SceneStatus.PENDING:
        return 'Waiting to start...';
      case SceneStatus.PROCESSING:
        return 'Processing request...';
      case SceneStatus.GENERATING_CODE:
        return 'Generating animation code...';
      case SceneStatus.RENDERING:
        return 'Rendering animation...';
      case SceneStatus.COMPLETED:
        return 'Animation ready!';
      case SceneStatus.FAILED:
        return 'Generation failed';
      default:
        return scene.status;
    }
  };

  const handleDownload = async () => {
    if (scene.video_url) {
      try {
        const blobUrl = await sceneApi.getVideoBlob(scene.id);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `animation_${scene.id}.mp4`;
        link.click();
        // Clean up the blob URL after download
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      } catch (error) {
        console.error('Failed to download video:', error);
      }
    }
  };

  const handleViewAllScenes = () => {
    navigate('/scenes');
  };

  const handleRegenerate = () => {
    regenerateScene.mutate(scene.id);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Animation Preview</h2>

      {/* Status Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <span className="text-lg font-medium text-gray-900">
              {getStatusText()}
            </span>
          </div>
        </div>

        {/* Progress Steps */}
        {scene.status !== SceneStatus.COMPLETED && scene.status !== SceneStatus.FAILED && (
          <div className="space-y-2 mt-4">
            <div className={`flex items-center space-x-2 ${
              scene.status === SceneStatus.PROCESSING || 
              scene.status === SceneStatus.GENERATING_CODE || 
              scene.status === SceneStatus.RENDERING ? 'text-blue-600' : 'text-gray-400'
            }`}>
              <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
              <span className="text-sm">Analyzing prompt</span>
            </div>
            <div className={`flex items-center space-x-2 ${
              scene.status === SceneStatus.GENERATING_CODE || 
              scene.status === SceneStatus.RENDERING ? 'text-blue-600' : 'text-gray-400'
            }`}>
              <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
              <span className="text-sm">Generating code</span>
            </div>
            <div className={`flex items-center space-x-2 ${
              scene.status === SceneStatus.RENDERING ? 'text-blue-600' : 'text-gray-400'
            }`}>
              <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
              <span className="text-sm">Rendering animation</span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {scene.error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{scene.error}</p>
          </div>
        )}

        {/* Video Preview */}
        {scene.status === SceneStatus.COMPLETED && scene.video_url && (
          <div className="mt-6">
            <VideoPlayer sceneId={scene.id} scene={scene} />
            
            <div className="space-y-3 mt-4">
              {/* Primary Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </button>
                
                <button
                  onClick={() => setShowCode(!showCode)}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Code2 className="w-4 h-4 mr-2" />
                  {showCode ? 'Hide' : 'View'} Code
                </button>
              </div>
              
              {/* Navigation Action */}
              <button
                onClick={handleViewAllScenes}
                className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <span>View All Scenes</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          </div>
        )}

        {/* Regenerate Button for Failed Scenes */}
        {scene.status === SceneStatus.FAILED && (
          <button
            onClick={handleRegenerate}
            disabled={regenerateScene.isPending}
            className="mt-4 w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Regenerate
          </button>
        )}
      </div>

      {/* Code Viewer */}
      {showCode && scene.code && (
        <CodeViewer
          code={scene.code}
          language={scene.status === SceneStatus.COMPLETED ? 'javascript' : 'text'}
        />
      )}
    </div>
  );
}