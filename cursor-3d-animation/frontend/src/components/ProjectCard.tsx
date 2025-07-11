import { Link } from 'react-router-dom';
import { Folder, Edit, Trash2, Film } from 'lucide-react';

// Inline types
interface Project {
  id: string;
  name: string;
  description?: string;
  scenes: string[];
  timeline: any[];
  created_at: string;
  updated_at: string;
}

interface ProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (projectId: string) => void;
}

export default function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  const formattedDate = new Date(project.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <Link to={`/projects/${project.id}`} className="block p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <Folder className="w-8 h-8 text-gray-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 hover:text-gray-700">
                {project.name}
              </h3>
              {project.description && (
                <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                  {project.description}
                </p>
              )}
              <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                <span className="flex items-center">
                  <Film className="w-4 h-4 mr-1" />
                  {project.scenes.length} scene{project.scenes.length !== 1 ? 's' : ''}
                </span>
                <span>Created {formattedDate}</span>
              </div>
            </div>
          </div>
        </div>
      </Link>

      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-end space-x-2">
        <button
          onClick={() => onEdit(project)}
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          <Edit className="w-4 h-4 mr-1" />
          Edit
        </button>
        <button
          onClick={() => onDelete(project.id)}
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Delete
        </button>
      </div>
    </div>
  );
}