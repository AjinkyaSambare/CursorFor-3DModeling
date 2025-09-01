import { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import type { Scene } from '../../types';

interface SceneEditModalProps {
  scene: Scene | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (sceneId: string, updates: SceneUpdateData) => void;
}

interface SceneUpdateData {
  prompt: string;
  duration: number;
  resolution: string;
  auto_regenerate: boolean;
}

const RESOLUTION_OPTIONS = [
  { value: '720p', label: '720p (HD)' },
  { value: '1080p', label: '1080p (Full HD)' },
  { value: '1440p', label: '1440p (2K)' },
  { value: '2160p', label: '2160p (4K)' },
];

export default function SceneEditModal({ 
  scene, 
  isOpen, 
  onClose, 
  onSave 
}: SceneEditModalProps) {
  const [formData, setFormData] = useState<SceneUpdateData>({
    prompt: '',
    duration: 5,
    resolution: '720p',
    auto_regenerate: true,
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // Initialize form data when scene changes
  useEffect(() => {
    if (scene) {
      const newFormData = {
        prompt: scene.original_prompt || scene.prompt,
        duration: scene.duration,
        resolution: scene.resolution,
        auto_regenerate: true,
      };
      setFormData(newFormData);
      setHasChanges(false);
    }
  }, [scene]);

  // Check for changes
  useEffect(() => {
    if (!scene) return;
    
    const hasPromptChange = formData.prompt !== (scene.original_prompt || scene.prompt);
    const hasDurationChange = formData.duration !== scene.duration;
    const hasResolutionChange = formData.resolution !== scene.resolution;
    
    setHasChanges(hasPromptChange || hasDurationChange || hasResolutionChange);
  }, [formData, scene]);

  const handleInputChange = (field: keyof SceneUpdateData, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!scene || !hasChanges) return;
    
    setSaving(true);
    try {
      await onSave(scene.id, formData);
      onClose();
    } catch (error) {
      console.error('Failed to save scene:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  if (!isOpen || !scene) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Edit Scene</h2>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Prompt Editor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Animation Prompt
            </label>
            <textarea
              value={formData.prompt}
              onChange={(e) => handleInputChange('prompt', e.target.value)}
              placeholder="Describe the animation you want to create..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={4}
            />
            <p className="mt-1 text-xs text-gray-500">
              Describe your animation in natural language. Be specific about what you want to visualize.
            </p>
          </div>

          {/* Duration and Resolution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (seconds)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                step="0.1"
                value={formData.duration}
                onChange={(e) => handleInputChange('duration', parseFloat(e.target.value) || 5)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">Between 1-30 seconds</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resolution
              </label>
              <select
                value={formData.resolution}
                onChange={(e) => handleInputChange('resolution', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {RESOLUTION_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Auto-regenerate option */}
          <div>
            <label className="flex items-start space-x-3">
              <input
                type="checkbox"
                checked={formData.auto_regenerate}
                onChange={(e) => handleInputChange('auto_regenerate', e.target.checked)}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Automatically regenerate animation
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  If enabled, the animation will be regenerated immediately after saving changes.
                  If disabled, you'll need to manually regenerate the scene later.
                </p>
              </div>
            </label>
          </div>

          {/* Warning for changes */}
          {hasChanges && formData.auto_regenerate && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Changes will trigger regeneration
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Your changes will automatically trigger a new animation generation. 
                  This may take a few minutes to complete.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            {hasChanges ? 'You have unsaved changes' : 'No changes made'}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center space-x-2 ${
                hasChanges && !saving
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}