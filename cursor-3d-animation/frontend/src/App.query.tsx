import React from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Sparkles, CheckCircle, XCircle, Loader2 } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      retry: 1,
    },
  },
});

// API test function
const fetchHealth = async () => {
  const response = await fetch('http://localhost:8000/health');
  if (!response.ok) {
    throw new Error('Network response was not ok');
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
          to="/test"
          className="inline-flex items-center px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          Test Page
        </Link>
        <Link
          to="/create"
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Create Animation
        </Link>
      </div>
    </div>
  );
}

function TestPage() {
  return (
    <div className="text-center py-16">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        Test Page
      </h1>
      <p className="text-xl text-gray-600 mb-8">
        Router and React Query are working!
      </p>
      <Link
        to="/"
        className="inline-flex items-center px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
      >
        Back to Home
      </Link>
    </div>
  );
}

function CreatePage() {
  return (
    <div className="text-center py-16">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        Create Animation
      </h1>
      <p className="text-xl text-gray-600 mb-8">
        Animation creation coming soon...
      </p>
      <Link
        to="/"
        className="inline-flex items-center px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
      >
        Back to Home
      </Link>
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
                <Link
                  to="/test"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Test
                </Link>
              </nav>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/test" element={<TestPage />} />
            <Route path="/create" element={<CreatePage />} />
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