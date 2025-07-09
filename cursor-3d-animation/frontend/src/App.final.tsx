import React, { useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery, useMutation } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Sparkles, CheckCircle, XCircle, Loader2, Play } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      retry: 1,
    },
  },
});

// API functions
const fetchHealth = async () => {
  const response = await fetch('http://localhost:8000/health');
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

const createScene = async (sceneData: any) => {
  const response = await fetch('http://localhost:8000/api/v1/scenes/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(sceneData),
  });
  if (!response.ok) {
    throw new Error('Failed to create scene');
  }
  return response.json();
};

const fetchScene = async (sceneId: string) => {
  const response = await fetch(`http://localhost:8000/api/v1/scenes/${sceneId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch scene');
  }
  return response.json();
};

// Health check component
function HealthCheck() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
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

// Scene status component
function SceneStatus({ sceneId }: { sceneId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['scene', sceneId],
    queryFn: () => fetchScene(sceneId),
    enabled: !!sceneId,
    refetchInterval: (data) => {
      if (!data) return false;
      const status = data.status;
      // Keep polling while processing
      if (status === 'pending' || status === 'processing' || 
          status === 'generating_code' || status === 'rendering') {
        return 2000; // Poll every 2 seconds
      }
      return false;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 text-blue-600">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Loading scene...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center space-x-2 text-red-600">
        <XCircle className="w-5 h-5" />
        <span>Error loading scene</span>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      default: return 'text-blue-600';
    }
  };

  if (!data) {
    return (
      <div className="flex items-center space-x-2 text-gray-500">
        <span>No data available</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={`flex items-center space-x-2 ${getStatusColor(data.status)}`}>
        {data.status === 'completed' ? (
          <CheckCircle className="w-5 h-5" />
        ) : data.status === 'failed' ? (
          <XCircle className="w-5 h-5" />
        ) : (
          <Loader2 className="w-5 h-5 animate-spin" />
        )}
        <span>Status: {data.status}</span>
      </div>
      
      {data.message && (
        <p className="text-gray-600">{data.message}</p>
      )}
      
      {data.error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{data.error}</p>
        </div>
      )}
      
      {data.video_url && (
        <div className="space-y-4">
          <p className="text-green-600 font-medium">Animation ready!</p>
          <video
            controls
            className="w-full max-w-md rounded-lg shadow-md"
            src={`http://localhost:8000${data.video_url}`}
            poster=""
          >
            Your browser does not support the video tag.
          </video>
          
          <div className="flex gap-3">
            <button
              onClick={() => {
                const link = document.createElement('a');
                link.href = `http://localhost:8000${data.video_url}`;
                link.download = `animation_${data.id}.mp4`;
                link.click();
              }}
              className="flex-1 bg-gray-900 text-white py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Video
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Create scene component
function CreateScene() {
  const [prompt, setPrompt] = useState('');
  const [sceneId, setSceneId] = useState<string | null>(null);
  
  const createSceneMutation = useMutation({
    mutationFn: createScene,
    onSuccess: (data) => {
      setSceneId(data.id);
    },
    onError: (error) => {
      console.error('Failed to create scene:', error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    
    createSceneMutation.mutate({
      prompt,
      library: 'manim',
      duration: 5,
      resolution: '1080p',
    });
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Create Animation</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
            Animation Prompt
          </label>
          <textarea
            id="prompt"
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the 3D animation you want to create..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={createSceneMutation.isPending || !prompt.trim()}
          className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {createSceneMutation.isPending ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Play className="w-5 h-5 mr-2" />
              Generate Animation
            </>
          )}
        </button>
      </form>

      {createSceneMutation.isError && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">
            Failed to create animation. Please try again.
          </p>
        </div>
      )}

      {sceneId && (
        <div className="mt-8 p-6 bg-white rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Animation Status</h3>
          <SceneStatus sceneId={sceneId} />
        </div>
      )}
    </div>
  );
}

// Simple page components
function HomePage() {
  return (
    <div className="text-center py-16">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        Welcome to Cursor for 3D Animation
      </h1>
      <p className="text-xl text-gray-600 mb-8">
        Create stunning 3D animations with AI
      </p>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8 inline-block">
        <h3 className="text-lg font-semibold mb-2">System Status</h3>
        <HealthCheck />
      </div>

      <div className="space-x-4">
        <Link
          to="/create"
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Play className="w-5 h-5 mr-2" />
          Create Animation
        </Link>
      </div>
    </div>
  );
}

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
              <nav className="space-x-4">
                <Link
                  to="/create"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
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
            <Route path="/create" element={<CreateScene />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;