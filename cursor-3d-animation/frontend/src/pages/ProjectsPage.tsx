import { Link } from 'react-router-dom';
import { Plus, Folder } from 'lucide-react';

export default function ProjectsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
        <button
          disabled
          className="inline-flex items-center px-4 py-2 bg-gray-300 text-gray-500 font-medium rounded-lg cursor-not-allowed"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Project
        </button>
      </div>

      {/* Coming Soon */}
      <div className="text-center py-16">
        <Folder className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Projects Coming Soon
        </h2>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          Organize your scenes into projects, create timelines, and export complete animations.
        </p>
        <Link
          to="/create"
          className="inline-flex items-center px-4 py-2 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          Create Scenes Instead
        </Link>
      </div>
    </div>
  );
}