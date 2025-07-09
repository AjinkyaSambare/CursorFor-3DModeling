import { useState } from 'react';
import { SceneResponse, SceneStatus } from '../types';
import { CheckCircle, XCircle, Loader2, Download, Code2, RefreshCw } from 'lucide-react';
import { sceneApi } from '../services/api';
import { useRegenerateScene } from '../hooks/useScenes';
import CodeViewer from './CodeViewer';

interface ScenePreviewProps {
  scene: SceneResponse;
  isLoading: boolean;
  onComplete?: () => void;
}

export default function ScenePreview({ scene, isLoading, onComplete }: ScenePreviewProps) {
  const [showCode, setShowCode] = useState(false);
  const regenerateScene = useRegenerateScene();

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

  const handleDownload = () => {
    if (scene.video_url) {
      const link = document.createElement('a');
      link.href = sceneApi.getVideoUrl(scene.id);
      link.download = `animation_${scene.id}.mp4`;
      link.click();
    }
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
            <video
              controls
              className="w-full rounded-lg shadow-md"
              src={sceneApi.getVideoUrl(scene.id)}
            />
            
            <div className="flex gap-3 mt-4">
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