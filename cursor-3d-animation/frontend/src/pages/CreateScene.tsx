import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, Loader2 } from 'lucide-react';
import { useCreateScene, useScene } from '../hooks/useScenes';
import ScenePreview from '../components/ScenePreview';

// Inline types
const AnimationLibrary = {
  MANIM: "manim"
} as const;

const Resolution = {
  HD: "720p",
  FULL_HD: "1080p",
  ULTRA_HD: "4K"
} as const;

interface SceneRequest {
  prompt: string;
  library?: string;
  duration?: number;
  resolution?: string;
  style?: Record<string, any>;
  use_enhanced_prompt?: boolean;
}

export default function CreateScene() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const createScene = useCreateScene();
  const [currentSceneId, setCurrentSceneId] = useState<string | null>(null);
  const [enhancePrompt, setEnhancePrompt] = useState(true);
  
  const [formData, setFormData] = useState<SceneRequest>({
    prompt: searchParams.get('prompt') || '',
    library: AnimationLibrary.MANIM,
    duration: 5,
    resolution: Resolution.FULL_HD,
  });

  const { data: sceneData, isLoading: sceneLoading } = useScene(
    currentSceneId || '',
    !!currentSceneId
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const requestData = {
        ...formData,
        use_enhanced_prompt: enhancePrompt
      };
      const response = await createScene.mutateAsync(requestData);
      setCurrentSceneId(response.id);
    } catch (error) {
      console.error('Failed to create scene:', error);
    }
  };

  const libraryOptions = [
    { value: AnimationLibrary.MANIM, label: 'Manim (Mathematical)' },
  ];

  const resolutionOptions = [
    { value: Resolution.HD, label: '720p HD' },
    { value: Resolution.FULL_HD, label: '1080p Full HD' },
    { value: Resolution.ULTRA_HD, label: '4K Ultra HD' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Form Section */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Create New Animation
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Prompt Input */}
            <div>
              <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
                Animation Prompt
              </label>
              <textarea
                id="prompt"
                rows={4}
                value={formData.prompt}
                onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                placeholder="Describe the animation you want to create..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                required
              />
              
              {/* Auto-enhance checkbox */}
              <div className="mt-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={enhancePrompt}
                    onChange={(e) => setEnhancePrompt(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-600">
                    <Sparkles className="w-4 h-4 inline mr-1" />
                    Auto-enhance prompt with AI
                  </span>
                </label>
                <p className="mt-1 text-xs text-gray-500">
                  Automatically improve your prompt for better animation results
                </p>
              </div>
            </div>

            {/* Library Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Animation Library
              </label>
              <div className="grid grid-cols-1 gap-3">
                {libraryOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="radio"
                      name="library"
                      value={option.value}
                      checked={formData.library === option.value}
                      onChange={(e) => setFormData({ ...formData, library: e.target.value as AnimationLibrary })}
                      className="mr-3"
                    />
                    <span className="text-gray-700">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
                Duration (seconds)
              </label>
              <input
                type="number"
                id="duration"
                min="1"
                max="30"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Resolution */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resolution
              </label>
              <select
                value={formData.resolution}
                onChange={(e) => setFormData({ ...formData, resolution: e.target.value as Resolution })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {resolutionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={createScene.isPending || !formData.prompt.trim()}
              className="w-full flex items-center justify-center px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {createScene.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate Animation
                </>
              )}
            </button>
          </form>
        </div>

        {/* Preview Section */}
        <div>
          {currentSceneId && sceneData && (
            <ScenePreview
              scene={sceneData}
              isLoading={sceneLoading}
              onComplete={() => navigate('/scenes')}
            />
          )}
        </div>
      </div>
    </div>
  );
}