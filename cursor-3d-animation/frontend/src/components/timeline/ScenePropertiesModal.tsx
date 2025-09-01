import { useState, useEffect } from 'react';
import { X, Clock, Monitor, Code, Calendar, User, FileVideo } from 'lucide-react';
import type { Scene } from '../../types';
import { sceneApi } from '../../services/api';

interface SceneProperties {
  id: string;
  prompt: string;
  original_prompt?: string;
  library: string;
  duration: number;
  resolution: string;
  status: string;
  error?: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown>;
  has_video: boolean;
  has_code: boolean;
  video_path?: string;
  file_size?: number;
}

interface ScenePropertiesModalProps {
  scene: Scene | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ScenePropertiesModal({ 
  scene, 
  isOpen, 
  onClose
}: ScenePropertiesModalProps) {
  const [properties, setProperties] = useState<SceneProperties | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load detailed properties when modal opens
  useEffect(() => {
    if (isOpen && scene) {
      loadProperties();
    }
  }, [isOpen, scene]);

  const loadProperties = async () => {
    if (!scene) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await sceneApi.getProperties(scene.id);
      setProperties(data as unknown as SceneProperties);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Scene Properties</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={loadProperties}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          ) : properties ? (
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Basic Information
                </h3>
                <div className="flex justify-center">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      properties.status === 'completed' ? 'bg-green-100 text-green-800' :
                      properties.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {properties.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Animation Settings */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Monitor className="w-5 h-5 mr-2" />
                  Animation Settings
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Library</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{properties.library.toUpperCase()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      Duration
                    </label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{properties.duration}s</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Resolution</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{properties.resolution}</p>
                  </div>
                </div>
              </div>

              {/* Prompt Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Prompt</h3>
                {properties.original_prompt && properties.original_prompt !== properties.prompt ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Original Prompt</label>
                      <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded border max-h-32 overflow-y-auto">
                        {properties.original_prompt}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Enhanced Prompt</label>
                      <div className="text-sm text-gray-900 bg-blue-50 p-3 rounded border max-h-32 overflow-y-auto">
                        {properties.prompt}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prompt</label>
                    <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded border max-h-32 overflow-y-auto">
                      {properties.prompt}
                    </div>
                  </div>
                )}
              </div>

              {/* File Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <FileVideo className="w-5 h-5 mr-2" />
                  Generated Files
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <Code className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Generated Code</p>
                      <p className="text-xs text-gray-500">
                        {properties.has_code ? 'Available' : 'Not generated'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <FileVideo className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Video File</p>
                      <p className="text-xs text-gray-500">
                        {properties.has_video ? `${formatFileSize(properties.file_size)}` : 'Not generated'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  Timeline
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{formatDate(properties.created_at)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{formatDate(properties.updated_at)}</p>
                  </div>
                </div>
              </div>

              {/* Error Information */}
              {properties.error && (
                <div>
                  <h3 className="text-lg font-medium text-red-900 mb-4">Error Details</h3>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-800">{properties.error}</p>
                  </div>
                </div>
              )}

            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}