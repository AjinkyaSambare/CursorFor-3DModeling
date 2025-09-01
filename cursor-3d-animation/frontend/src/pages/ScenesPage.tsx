import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { useScenes } from '../hooks/useScenes';
import { useQueryClient } from '@tanstack/react-query';
import SceneCard from '../components/SceneCard';
import ErrorBoundary from '../components/ErrorBoundary';

export default function ScenesPage() {
  const [page, setPage] = useState(1);
  const [retryCount, setRetryCount] = useState(0);
  const { data, isLoading, isError, refetch, isFetching, error } = useScenes(page);
  const queryClient = useQueryClient();
  
  // Reset retry count when data loads successfully
  useEffect(() => {
    if (data && !isError) {
      setRetryCount(0);
    }
  }, [data, isError]);
  
  const handleManualRefresh = async () => {
    setRetryCount(prev => prev + 1);
    queryClient.removeQueries({ queryKey: ['scenes'] }); // Clear cache
    await refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center max-w-md mx-auto">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Failed to load scenes
          </h2>
          <p className="text-gray-600 mb-4">
            {error?.message || 'Please check your connection and try again.'}
          </p>
          <div className="space-y-2">
            <button
              onClick={handleManualRefresh}
              disabled={isFetching}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Try Again {retryCount > 0 && `(${retryCount})`}
            </button>
            {retryCount >= 2 && (
              <p className="text-sm text-gray-500">
                Still having issues? Try refreshing the entire page.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const scenes = (data as any)?.scenes || [];
  const totalPages = Math.ceil(((data as any)?.total || 0) / ((data as any)?.page_size || 20));

  return (
    <ErrorBoundary>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-gray-900">Animation Scenes</h1>
            {(isFetching && !isLoading) && (
              <div className="text-sm text-gray-500 flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-2"></div>
                Updating...
              </div>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleManualRefresh}
              disabled={isFetching}
              className="inline-flex items-center px-3 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Link
              to="/create"
              className="inline-flex items-center px-4 py-2 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Scene
            </Link>
          </div>
        </div>

        {/* Scenes Grid */}
        {scenes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No scenes created yet.</p>
            <Link
              to="/create"
              className="inline-flex items-center px-4 py-2 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Your First Scene
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {scenes.map((scene: any) => (
                <SceneCard key={scene.id || Math.random()} scene={scene} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2 mt-8">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                <span className="px-4 py-2 text-sm text-gray-700">
                  Page {page} of {totalPages}
                </span>
                
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}