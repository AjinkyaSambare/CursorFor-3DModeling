import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Film, Loader2, GripVertical, X, Trash2 } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useProject, useRemoveSceneFromProject, useReorderProjectScenes, useAddSceneToProject } from '../hooks/useProjects';
import { useScenes } from '../hooks/useScenes';
import { sceneApi, projectApi } from '../services/api';

// Helper function to create user-friendly scene names
const getSceneDisplayName = (scene: Scene): string => {
  // Use original prompt if available, otherwise use enhanced prompt
  const prompt = scene.original_prompt || scene.prompt;
  
  // Create a short, descriptive name
  const words = prompt.split(' ').slice(0, 6); // Take first 6 words
  let displayName = words.join(' ');
  
  // Add ellipsis if truncated
  if (prompt.split(' ').length > 6) {
    displayName += '...';
  }
  
  // Capitalize first letter
  displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
  
  return displayName;
};

// Inline types
interface Scene {
  id: string;
  prompt: string;
  original_prompt?: string;
  library: string;
  duration: number;
  resolution: string;
  status: string;
  generated_code?: string;
  video_path?: string;
  thumbnail_path?: string;
  metadata: Record<string, any>;
  error?: string;
  created_at: string;
  updated_at: string;
}

interface SortableSceneItemProps {
  scene: Scene;
  onRemove: (sceneId: string) => void;
}

function SortableSceneItem({ scene, onRemove }: SortableSceneItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: scene.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white border border-gray-200 rounded-lg p-4 flex items-center space-x-4"
    >
      <div {...attributes} {...listeners} className="cursor-move">
        <GripVertical className="w-5 h-5 text-gray-400" />
      </div>
      
      <div className="flex-1">
        <h4 className="font-medium text-gray-900">{getSceneDisplayName(scene)}</h4>
        <div className="mt-1 text-sm text-gray-500">
          {scene.duration}s • {scene.resolution} • {scene.status}
        </div>
      </div>

      {scene.video_path && (
        <video
          src={sceneApi.getVideoUrl(scene.id)}
          className="w-32 h-20 object-cover rounded"
          controls={false}
        />
      )}

      <button
        onClick={() => onRemove(scene.id)}
        className="text-red-600 hover:text-red-700"
      >
        <Trash2 className="w-5 h-5" />
      </button>
    </div>
  );
}

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [selectedScenes, setSelectedScenes] = useState<Set<string>>(new Set());
  const [isAddingScenesOpen, setIsAddingScenesOpen] = useState(false);

  const { data: project, isLoading: projectLoading } = useProject(projectId!);
  const { data: scenesData, isLoading: scenesLoading } = useScenes();
  const removeScene = useRemoveSceneFromProject(projectId!);
  const reorderScenes = useReorderProjectScenes(projectId!);
  const addScene = useAddSceneToProject(projectId!);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (projectLoading || !project) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  // Get full scene objects for this project
  const projectScenes = project.scenes
    .map(sceneId => scenesData?.scenes.find(s => s.id === sceneId))
    .filter(Boolean) as Scene[];

  // Get available scenes (not in project)
  const availableScenes = scenesData?.scenes.filter(
    scene => !project.scenes.includes(scene.id)
  ) || [];

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = project.scenes.indexOf(active.id);
      const newIndex = project.scenes.indexOf(over.id);

      const newOrder = arrayMove(project.scenes, oldIndex, newIndex);
      
      try {
        await reorderScenes.mutateAsync(newOrder);
      } catch (error) {
        console.error('Failed to reorder scenes:', error);
      }
    }
  };

  const handleRemoveScene = async (sceneId: string) => {
    try {
      await removeScene.mutateAsync(sceneId);
    } catch (error) {
      console.error('Failed to remove scene:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/projects"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Projects
        </Link>
        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
            {project.description && (
              <p className="mt-2 text-gray-600">{project.description}</p>
            )}
          </div>
          
          <button
            onClick={() => navigate(`/projects/${projectId}/timeline`)}
            className="inline-flex items-center px-4 py-2 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Film className="w-5 h-5 mr-2" />
            Timeline Editor
          </button>
        </div>
      </div>

      {/* Scenes */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            Scenes ({projectScenes.length})
          </h2>
          <button
            onClick={() => setIsAddingScenesOpen(true)}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Scenes
          </button>
        </div>

        {projectScenes.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Film className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No scenes in this project yet.</p>
            <button
              onClick={() => setIsAddingScenesOpen(true)}
              className="mt-4 inline-flex items-center px-4 py-2 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Your First Scene
            </button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={project.scenes}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {projectScenes.map((scene) => (
                  <SortableSceneItem
                    key={scene.id}
                    scene={scene}
                    onRemove={handleRemoveScene}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Add Scenes Modal */}
      {isAddingScenesOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
              onClick={() => setIsAddingScenesOpen(false)}
            />

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Add Scenes to Project
                  </h3>
                  <button
                    onClick={() => setIsAddingScenesOpen(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {scenesLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                  </div>
                ) : availableScenes.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">No available scenes to add.</p>
                    <Link
                      to="/create"
                      className="mt-4 inline-flex items-center px-4 py-2 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      Create New Scene
                    </Link>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    <div className="space-y-2">
                      {availableScenes.map((scene) => (
                        <label
                          key={scene.id}
                          className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedScenes.has(scene.id)}
                            onChange={(e) => {
                              const newSelected = new Set(selectedScenes);
                              if (e.target.checked) {
                                newSelected.add(scene.id);
                              } else {
                                newSelected.delete(scene.id);
                              }
                              setSelectedScenes(newSelected);
                            }}
                            className="h-4 w-4 text-gray-900 focus:ring-gray-900 border-gray-300 rounded"
                          />
                          <div className="ml-3 flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {getSceneDisplayName(scene)}
                            </p>
                            <p className="text-sm text-gray-500">
                              {scene.duration}s • {scene.resolution}
                            </p>
                          </div>
                          {scene.video_path && (
                            <video
                              src={sceneApi.getVideoUrl(scene.id)}
                              className="w-24 h-16 object-cover rounded ml-3"
                              controls={false}
                            />
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={async () => {
                    // Add selected scenes to project
                    for (const sceneId of selectedScenes) {
                      try {
                        await addScene.mutateAsync(sceneId);
                      } catch (error) {
                        console.error('Failed to add scene:', error);
                      }
                    }
                    setSelectedScenes(new Set());
                    setIsAddingScenesOpen(false);
                  }}
                  disabled={selectedScenes.size === 0}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-gray-900 text-base font-medium text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Add {selectedScenes.size} Scene{selectedScenes.size !== 1 ? 's' : ''}
                </button>
                <button
                  onClick={() => {
                    setSelectedScenes(new Set());
                    setIsAddingScenesOpen(false);
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}