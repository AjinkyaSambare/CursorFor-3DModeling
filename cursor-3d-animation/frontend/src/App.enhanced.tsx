import React, { useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import { 
  Sparkles, CheckCircle, XCircle, Loader2, Play, Grid, Plus, 
  Settings, Code, Download, Trash2, RefreshCw, Eye, Clock,
  Filter, Search, ChevronLeft, ChevronRight
} from 'lucide-react';
// API functions
const API_BASE = 'http://localhost:8000';

const api = {
  // Health check
  health: async () => {
    const response = await fetch(`${API_BASE}/health`);
    if (!response.ok) throw new Error('Network response was not ok');
    return response.json();
  },

  // Scene management
  scenes: {
    create: async (data: any) => {
      const response = await fetch(`${API_BASE}/api/v1/scenes/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create scene');
      return response.json();
    },

    get: async (id: string) => {
      const response = await fetch(`${API_BASE}/api/v1/scenes/${id}`);
      if (!response.ok) throw new Error('Failed to fetch scene');
      return response.json();
    },

    list: async (page = 1, pageSize = 12) => {
      const response = await fetch(`${API_BASE}/api/v1/scenes/?page=${page}&page_size=${pageSize}`);
      if (!response.ok) throw new Error('Failed to fetch scenes');
      return response.json();
    },

    delete: async (id: string) => {
      const response = await fetch(`${API_BASE}/api/v1/scenes/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete scene');
      return response.json();
    },

    regenerate: async (id: string) => {
      const response = await fetch(`${API_BASE}/api/v1/scenes/${id}/regenerate`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to regenerate scene');
      return response.json();
    },

    getCode: async (id: string) => {
      const response = await fetch(`${API_BASE}/api/v1/scenes/${id}/code`);
      if (!response.ok) throw new Error('Failed to fetch code');
      return response.json();
    },

    getVideoUrl: (id: string) => `${API_BASE}/api/v1/scenes/${id}/video`,
  },

  // Prompt enhancement
  prompts: {
    enhance: async (data: any) => {
      const response = await fetch(`${API_BASE}/api/v1/prompts/enhance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to enhance prompt');
      return response.json();
    },

    analyze: async (data: any) => {
      const response = await fetch(`${API_BASE}/api/v1/prompts/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to analyze prompt');
      return response.json();
    },

    getSuggestions: async () => {
      const response = await fetch(`${API_BASE}/api/v1/prompts/suggestions`);
      if (!response.ok) throw new Error('Failed to fetch suggestions');
      return response.json();
    },
  },
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      retry: 1,
    },
  },
});

// Enhanced types
interface Scene {
  id: string;
  prompt: string;
  original_prompt?: string;
  library: string;
  duration: number;
  resolution: string;
  status: 'pending' | 'processing' | 'generating_code' | 'rendering' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  video_path?: string;
  generated_code?: string;
  error?: string;
}

// Animation library options
const ANIMATION_LIBRARIES = [
  { value: 'manim', label: 'Manim', description: 'Professional educational animations' },
];

const DURATIONS = [3, 5, 10, 15, 30];
const RESOLUTIONS = ['720p', '1080p', '4K'];

// Prompt templates
const PROMPT_TEMPLATES = [
  {
    title: 'Circle to Square',
    prompt: 'A blue circle smoothly transforming into a red square',
    library: 'manim',
    duration: 5,
  },
  {
    title: 'Spinning Shapes',
    prompt: 'A triangle, circle, and square rotating around each other',
    library: 'manim',
    duration: 8,
  },
  {
    title: 'Color Transition',
    prompt: 'A circle changing colors from blue to red to green',
    library: 'manim',
    duration: 6,
  },
  {
    title: 'Growing Spiral',
    prompt: 'A spiral line growing outward from the center',
    library: 'manim',
    duration: 10,
  },
  {
    title: 'Bouncing Ball',
    prompt: 'A colorful circle bouncing up and down with smooth animation',
    library: 'manim',
    duration: 8,
  },
  {
    title: 'Rotating Shapes',
    prompt: 'Multiple colorful geometric shapes rotating around a center point',
    library: 'manim',
    duration: 12,
  },
];

// Health check component
function HealthCheck() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['health'],
    queryFn: api.health,
  });

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 text-blue-600">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Checking backend...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center space-x-2 text-red-600">
        <XCircle className="w-5 h-5" />
        <span>Backend disconnected</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 text-green-600">
      <CheckCircle className="w-5 h-5" />
      <span>Backend connected</span>
    </div>
  );
}

// Scene status badge
function StatusBadge({ status }: { status: string }) {
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      case 'processing': 
      case 'generating_code': 
      case 'rendering': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusStyle(status)}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// Error message helper
function ErrorMessage({ error }: { error: string }) {
  const getErrorMessage = (error: string) => {
    if (error.includes('LaTeX') || error.includes('latex')) {
      return {
        title: 'LaTeX Error',
        message: 'This animation requires LaTeX which is not installed. Try using simpler animations with basic shapes and text.',
        suggestion: 'Use prompts like "red circle to blue square" or "rotating triangle"'
      };
    }
    
    if (error.includes('timeout') || error.includes('TimeoutError')) {
      return {
        title: 'Rendering Timeout',
        message: 'The animation took too long to render. Try a simpler animation or shorter duration.',
        suggestion: 'Use basic shapes and shorter durations (3-5 seconds)'
      };
    }
    
    return {
      title: 'Rendering Error',
      message: 'Something went wrong during rendering. Please try again with a different prompt.',
      suggestion: 'Try using our prompt templates for guaranteed success'
    };
  };

  const { title, message, suggestion } = getErrorMessage(error);

  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
      <h4 className="font-medium text-red-800 mb-2">{title}</h4>
      <p className="text-red-700 text-sm mb-2">{message}</p>
      <p className="text-red-600 text-xs italic">{suggestion}</p>
    </div>
  );
}

// Scene card component
function SceneCard({ scene }: { scene: Scene }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const deleteMutation = useMutation({
    mutationFn: api.scenes.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenes'] });
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: api.scenes.regenerate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenes'] });
    },
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Video thumbnail */}
      <div className="aspect-video bg-gray-100 flex items-center justify-center">
        {scene.status === 'completed' && scene.video_path ? (
          <video
            className="w-full h-full object-cover"
            src={api.scenes.getVideoUrl(scene.id)}
            poster=""
            muted
            preload="metadata"
          />
        ) : (
          <div className="text-gray-400">
            <Play className="w-12 h-12" />
          </div>
        )}
      </div>

      {/* Card content */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-gray-900 truncate pr-2">
            {scene.original_prompt || scene.prompt}
          </h3>
          <StatusBadge status={scene.status} />
        </div>

        <div className="flex items-center text-sm text-gray-500 mb-3">
          <span className="bg-gray-100 px-2 py-1 rounded text-xs mr-2">
            {scene.library}
          </span>
          {scene.original_prompt && (
            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs mr-2 flex items-center">
              <Sparkles className="w-3 h-3 mr-1" />
              Enhanced
            </span>
          )}
          <Clock className="w-4 h-4 mr-1" />
          <span>{scene.duration}s</span>
        </div>

        <p className="text-sm text-gray-600 mb-3">
          {formatDate(scene.created_at)}
        </p>

        {/* Actions */}
        <div className="flex space-x-2">
          {scene.status === 'completed' && (
            <>
              <button
                onClick={() => navigate(`/scenes/${scene.id}`)}
                className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                <Eye className="w-4 h-4 mr-1" />
                View
              </button>
              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = api.scenes.getVideoUrl(scene.id);
                  link.download = `animation_${scene.id}.mp4`;
                  link.click();
                }}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4" />
              </button>
            </>
          )}
          
          {scene.status === 'failed' && (
            <button
              onClick={() => regenerateMutation.mutate(scene.id)}
              disabled={regenerateMutation.isPending}
              className="flex-1 bg-orange-600 text-white px-3 py-2 rounded-md text-sm hover:bg-orange-700 disabled:opacity-50 transition-colors flex items-center justify-center"
            >
              {regenerateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Retry
                </>
              )}
            </button>
          )}

          <button
            onClick={() => deleteMutation.mutate(scene.id)}
            disabled={deleteMutation.isPending}
            className="px-3 py-2 border border-red-300 text-red-600 rounded-md text-sm hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Enhanced create scene form
function CreateSceneForm() {
  const [prompt, setPrompt] = useState('');
  const [library, setLibrary] = useState('manim');
  const [duration, setDuration] = useState(5);
  const [resolution, setResolution] = useState('1080p');
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [useEnhancedPrompt, setUseEnhancedPrompt] = useState(true);
  const navigate = useNavigate();

  const createMutation = useMutation({
    mutationFn: api.scenes.create,
    onSuccess: (data) => {
      navigate(`/scenes/${data.id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    
    createMutation.mutate({
      prompt,
      library,
      duration,
      resolution,
      style: {},
      use_enhanced_prompt: useEnhancedPrompt
    });
  };

  const applyTemplate = (template: typeof PROMPT_TEMPLATES[0]) => {
    setPrompt(template.prompt);
    setLibrary(template.library);
    setDuration(template.duration);
    setSelectedTemplate(PROMPT_TEMPLATES.indexOf(template));
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Animation</h2>
        
        {/* Template gallery */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Start Templates</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {PROMPT_TEMPLATES.map((template, index) => (
              <button
                key={index}
                onClick={() => applyTemplate(template)}
                className={`p-4 border rounded-lg text-left hover:bg-gray-50 transition-colors ${
                  selectedTemplate === index ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <h4 className="font-medium text-gray-900 mb-1">{template.title}</h4>
                <p className="text-sm text-gray-600 mb-2">{template.prompt}</p>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <span className="bg-gray-100 px-2 py-1 rounded">{template.library}</span>
                  <span>{template.duration}s</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Prompt input */}
          <div>
            <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
              Animation Description
            </label>
            <textarea
              id="prompt"
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the animation you want to create..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              required
            />
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-700 text-sm">
                <strong>💡 Best Practices:</strong> Use simple descriptions with basic shapes (circle, square, triangle) and colors. 
                Avoid complex mathematical formulas or equations for best results.
              </p>
            </div>
          </div>

          {/* Auto Enhance Prompts checkbox */}
          <div className="flex items-start space-x-3">
            <div className="flex items-center h-5">
              <input
                id="use-enhanced-prompt"
                name="use-enhanced-prompt"
                type="checkbox"
                checked={useEnhancedPrompt}
                onChange={(e) => setUseEnhancedPrompt(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
            </div>
            <div className="text-sm">
              <label htmlFor="use-enhanced-prompt" className="font-medium text-gray-700 cursor-pointer">
                Auto Enhance Prompts
              </label>
              <p className="text-gray-600 mt-1">
                Transform rough prompts into detailed descriptions using AI for better animation results. 
                {useEnhancedPrompt ? (
                  <span className="text-blue-600 font-medium"> (Recommended)</span>
                ) : (
                  <span className="text-orange-600 font-medium"> (Your prompt will be used as-is)</span>
                )}
              </p>
            </div>
          </div>

          {/* Controls row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Library selection */}
            <div>
              <label htmlFor="library" className="block text-sm font-medium text-gray-700 mb-2">
                Animation Library
              </label>
              <select
                id="library"
                value={library}
                onChange={(e) => setLibrary(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {ANIMATION_LIBRARIES.map((lib) => (
                  <option key={lib.value} value={lib.value}>
                    {lib.label} - {lib.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Duration */}
            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
                Duration (seconds)
              </label>
              <select
                id="duration"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {DURATIONS.map((dur) => (
                  <option key={dur} value={dur}>
                    {dur}s
                  </option>
                ))}
              </select>
            </div>

            {/* Resolution */}
            <div>
              <label htmlFor="resolution" className="block text-sm font-medium text-gray-700 mb-2">
                Resolution
              </label>
              <select
                id="resolution"
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {RESOLUTIONS.map((res) => (
                  <option key={res} value={res}>
                    {res}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={createMutation.isPending || !prompt.trim()}
            className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                {useEnhancedPrompt ? 'Enhancing & Creating Animation...' : 'Creating Animation...'}
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                {useEnhancedPrompt ? 'Enhance & Generate Animation' : 'Generate Animation'}
              </>
            )}
          </button>
        </form>

        {createMutation.isError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">
              Failed to create animation. Please try again.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Scenes gallery
function ScenesGallery() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const { data: scenesData, isLoading, error } = useQuery({
    queryKey: ['scenes', page, filter, search],
    queryFn: () => api.scenes.list(page, 12),
  });

  const filteredScenes = scenesData?.scenes?.filter(scene => {
    const matchesFilter = filter === 'all' || scene.status === filter;
    const matchesSearch = scene.prompt.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  }) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-700">Failed to load scenes</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">My Animations</h1>
        <Link
          to="/create"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create New
        </Link>
      </div>

      {/* Filters and search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search animations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="processing">Processing</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Scenes grid */}
      {filteredScenes.length === 0 ? (
        <div className="text-center py-12">
          <Grid className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            {search || filter !== 'all' ? 'No animations match your filters' : 'No animations yet'}
          </p>
          <Link
            to="/create"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mt-4"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Animation
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredScenes.map((scene) => (
            <SceneCard key={scene.id} scene={scene} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {scenesData && scenesData.total_pages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <span className="px-4 py-2 text-sm text-gray-700">
            Page {page} of {scenesData.total_pages}
          </span>
          
          <button
            onClick={() => setPage(p => Math.min(scenesData.total_pages, p + 1))}
            disabled={page === scenesData.total_pages}
            className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// Scene detail view
function SceneDetail({ sceneId }: { sceneId: string }) {
  const [showCode, setShowCode] = useState(false);
  const navigate = useNavigate();

  const { data: scene, isLoading } = useQuery({
    queryKey: ['scene', sceneId],
    queryFn: () => api.scenes.get(sceneId),
    refetchInterval: (data) => {
      if (!data) return false;
      const status = data.status;
      return ['pending', 'processing', 'generating_code', 'rendering'].includes(status) ? 2000 : false;
    },
  });

  // Get full scene data from the list to show complete information
  const { data: scenesData } = useQuery({
    queryKey: ['scenes'],
    queryFn: () => api.scenes.list(1, 100),
  });

  const fullSceneData = scenesData?.scenes?.find(s => s.id === sceneId);

  const { data: codeData } = useQuery({
    queryKey: ['scene-code', sceneId],
    queryFn: () => api.scenes.getCode(sceneId),
    enabled: showCode && scene?.status === 'completed',
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!scene) {
    return (
      <div className="text-center py-12">
        <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-700 mb-4">Scene not found</p>
        <button
          onClick={() => navigate('/scenes')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Back to Scenes
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/scenes')}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Scenes
        </button>
        <StatusBadge status={scene.status} />
      </div>

      {/* Scene info */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {fullSceneData?.original_prompt || fullSceneData?.prompt || 'Animation Scene'}
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Details</h3>
            
            <div className="space-y-3">
              {fullSceneData?.original_prompt ? (
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center mb-2">
                      <span className="text-sm text-gray-500">Original Prompt:</span>
                      <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">User Input</span>
                    </div>
                    <p className="text-gray-700 text-sm bg-gray-50 p-3 rounded border-l-4 border-gray-300">
                      {fullSceneData.original_prompt}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center mb-2">
                      <span className="text-sm text-gray-500">Enhanced Prompt:</span>
                      <span className="ml-2 bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs flex items-center">
                        <Sparkles className="w-3 h-3 mr-1" />
                        AI Enhanced
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm bg-blue-50 p-3 rounded border-l-4 border-blue-300">
                      {fullSceneData.prompt}
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <span className="text-sm text-gray-500 block">Prompt:</span>
                  <p className="text-gray-700">{fullSceneData?.prompt || 'No prompt available'}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-500 block">Library:</span>
                  <span className="text-sm font-medium">{fullSceneData?.library || 'Unknown'}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500 block">Duration:</span>
                  <span className="text-sm font-medium">{fullSceneData?.duration || 'Unknown'}s</span>
                </div>
              </div>
              
              <div>
                <span className="text-sm text-gray-500 block">Status:</span>
                <StatusBadge status={scene.status} />
              </div>
              
              <div>
                <span className="text-sm text-gray-500 block">Created:</span>
                <span className="text-sm font-medium">
                  {fullSceneData?.created_at ? new Date(fullSceneData.created_at).toLocaleString() : 'Unknown'}
                </span>
              </div>
              
              <div>
                <span className="text-sm text-gray-500 block">Scene ID:</span>
                <code className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">{scene.id}</code>
              </div>
            </div>
          </div>

          <div>
            {scene.status === 'completed' && scene.video_url && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Preview</h3>
                <video
                  controls
                  className="w-full rounded-lg shadow-sm"
                  src={`http://localhost:8000${scene.video_url}`}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            )}
          </div>
        </div>

        {/* Error message */}
        {scene.error && (
          <div className="mt-4">
            <ErrorMessage error={scene.error} />
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex flex-wrap gap-3">
          {scene.status === 'completed' && (
            <>
              <button
                onClick={() => setShowCode(!showCode)}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Code className="w-4 h-4 mr-2" />
                {showCode ? 'Hide Code' : 'View Code'}
              </button>
              
              {scene.video_url && (
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = `http://localhost:8000${scene.video_url}`;
                    link.download = `animation_${scene.id}.mp4`;
                    link.click();
                  }}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Video
                </button>
              )}
            </>
          )}
        </div>

        {/* Code viewer */}
        {showCode && (scene.code || fullSceneData?.generated_code) && (
          <div className="mt-6">
            <h3 className="font-semibold text-gray-900 mb-2">Generated Code</h3>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-x-auto">
              <pre className="text-sm text-gray-800">
                <code>{scene.code || fullSceneData?.generated_code}</code>
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Home page
function HomePage() {
  const { data: scenesData } = useQuery({
    queryKey: ['scenes-stats'],
    queryFn: () => api.scenes.list(1, 6),
  });

  const recentScenes = scenesData?.scenes?.slice(0, 3) || [];
  const completedScenes = scenesData?.scenes?.filter(s => s.status === 'completed').length || 0;

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <div className="text-center py-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Create Stunning
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {' '}Educational Animations
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            Transform your ideas into professional-quality animations using AI-powered tools. 
            Perfect for educators, content creators, and professionals who need to visualize complex concepts.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link
              to="/create"
              className="inline-flex items-center px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Your First Animation
            </Link>
            
            <Link
              to="/scenes"
              className="inline-flex items-center px-8 py-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all duration-200 transform hover:scale-105"
            >
              <Grid className="w-5 h-5 mr-2" />
              Explore Gallery
            </Link>
          </div>

        </div>
      </div>

      {/* Features Section */}
      <div className="py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Why Choose Cursor for 3D Animation?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">AI-Powered Generation</h3>
              <p className="text-gray-600">
                Simply describe your animation in natural language and watch as our AI generates 
                professional-quality code and renders stunning visuals.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Code className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Professional Quality</h3>
              <p className="text-gray-600">
                Powered by Manim, the same library used by 3Blue1Brown for creating 
                professional educational animations with mathematical precision.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Play className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Instant Preview</h3>
              <p className="text-gray-600">
                See your animations come to life in real-time with our instant preview system. 
                No coding knowledge required!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {scenesData?.total || 0}
              </div>
              <p className="text-gray-600">Total Animations Created</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600 mb-2">
                {completedScenes}
              </div>
              <p className="text-gray-600">Successfully Rendered</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600 mb-2">
                3
              </div>
              <p className="text-gray-600">Animation Libraries</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Animations */}
      {recentScenes.length > 0 && (
        <div className="py-16">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Recent Animations</h2>
              <Link
                to="/scenes"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                View All →
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {recentScenes.map((scene) => (
                <div key={scene.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="aspect-video bg-gray-100 flex items-center justify-center">
                    {scene.status === 'completed' && scene.video_path ? (
                      <video
                        className="w-full h-full object-cover"
                        src={api.scenes.getVideoUrl(scene.id)}
                        poster=""
                        muted
                        preload="metadata"
                      />
                    ) : (
                      <div className="text-gray-400">
                        <Play className="w-12 h-12" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2 truncate">
                      {scene.original_prompt || scene.prompt}
                    </h3>
                    <div className="flex items-center justify-between">
                      <StatusBadge status={scene.status} />
                      <span className="text-sm text-gray-500">
                        {scene.library}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CTA Section */}
      <div className="py-16 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Create Amazing Animations?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of educators and creators who are already using AI to bring their ideas to life.
          </p>
          <Link
            to="/create"
            className="inline-flex items-center px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-50 transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Get Started Now
          </Link>
        </div>
      </div>
    </div>
  );
}

// Main app content
function AppContent() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link to="/" className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900">
                  Cursor for 3D Animation
                </span>
              </Link>
              
              <nav className="flex items-center space-x-1">
                <Link
                  to="/"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Home
                </Link>
                <Link
                  to="/scenes"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Gallery
                </Link>
                <Link
                  to="/create"
                  className="bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Create
                </Link>
              </nav>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/scenes" element={<ScenesGallery />} />
            <Route path="/create" element={<CreateSceneForm />} />
            <Route path="/scenes/:sceneId" element={<SceneDetailWrapper />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

// Wrapper for scene detail to extract params
function SceneDetailWrapper() {
  const { sceneId } = useParams<{ sceneId: string }>();
  if (!sceneId) return <div>Scene not found</div>;
  return <SceneDetail sceneId={sceneId} />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;