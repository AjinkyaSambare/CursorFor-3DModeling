import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Folder, Loader2 } from 'lucide-react';
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject } from '../hooks/useProjects';
import ProjectCard from '../components/ProjectCard';
import ProjectModal from '../components/ProjectModal';

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

interface ProjectRequest {
  name: string;
  description?: string;
  scenes?: string[];
}

export default function ProjectsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: projects, isLoading, error } = useProjects();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject(editingProject?.id || '');
  const deleteProject = useDeleteProject();

  const handleCreateProject = async (data: ProjectRequest) => {
    try {
      await createProject.mutateAsync(data);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleUpdateProject = async (data: ProjectRequest) => {
    try {
      await updateProject.mutateAsync(data);
      setIsModalOpen(false);
      setEditingProject(undefined);
    } catch (error) {
      console.error('Failed to update project:', error);
    }
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setIsModalOpen(true);
  };

  const handleDelete = async (projectId: string) => {
    if (window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      setDeletingId(projectId);
      try {
        await deleteProject.mutateAsync(projectId);
      } catch (error) {
        console.error('Failed to delete project:', error);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const openNewProjectModal = () => {
    setEditingProject(undefined);
    setIsModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
        <button
          onClick={openNewProjectModal}
          className="inline-flex items-center px-4 py-2 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Project
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <p className="text-red-600">Failed to load projects. Please try again.</p>
        </div>
      ) : projects && projects.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <Folder className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            No Projects Yet
          </h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Create your first project to organize your scenes and build complete animations.
          </p>
          <button
            onClick={openNewProjectModal}
            className="inline-flex items-center px-4 py-2 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Your First Project
          </button>
        </div>
      )}

      {/* Modal */}
      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProject(undefined);
        }}
        onSubmit={editingProject ? handleUpdateProject : handleCreateProject}
        project={editingProject}
        title={editingProject ? 'Edit Project' : 'Create New Project'}
      />
    </div>
  );
}