import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useProject } from '../hooks/useProjects';
import { useScenes } from '../hooks/useScenes';
import { projectApi, sceneApi } from '../services/api';
import TimelineCanvas from '../components/timeline/TimelineCanvas';
import PlaybackControls from '../components/timeline/PlaybackControls';
import ScenePreview from '../components/timeline/ScenePreview';
import ExportModal from '../components/export/ExportModal';
import ExportProgress from '../components/export/ExportProgress';
import TimelineToolbar from '../components/timeline/TimelineToolbar';
import SceneContextMenu from '../components/timeline/SceneContextMenu';
import ScenePropertiesModal from '../components/timeline/ScenePropertiesModal';
import SceneEditModal from '../components/timeline/SceneEditModal';
import CodeViewerModal from '../components/timeline/CodeViewerModal';
import { useUndoRedo, createSceneDurationCommand, createTransitionChangeCommand } from '../hooks/useUndoRedo';
import { useDeleteScene, useRegenerateScene } from '../hooks/useScenes';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import toast from 'react-hot-toast';

// Inline types
interface Scene {
  id: string;
  prompt: string;
  library: string;
  duration: number;
  resolution: string;
  status: string;
  generated_code?: string;
  video_path?: string;
  thumbnail_path?: string;
  metadata: Record<string, unknown>;
  error?: string;
  created_at: string;
  updated_at: string;
}

export default function TimelineEditorPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showExportProgress, setShowExportProgress] = useState(false);
  const [currentExportId, setCurrentExportId] = useState<string | null>(null);
  const [transitions, setTransitions] = useState<Record<string, { id: string; type: string; duration: number }>>({});
  const [contextMenu, setContextMenu] = useState<{ scene: Scene; position: { x: number; y: number } } | null>(null);
  const [showPropertiesModal, setShowPropertiesModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [selectedModalScene, setSelectedModalScene] = useState<Scene | null>(null);

  // Undo/Redo system
  const undoRedo = useUndoRedo(100);
  const deleteScene = useDeleteScene();
  const regenerateScene = useRegenerateScene();
  
  const { data: project, isLoading: projectLoading } = useProject(projectId!);
  const { data: scenesData } = useScenes();

  // Get full scene objects for this project
  const projectScenes = project?.scenes
    .map(sceneId => scenesData?.scenes.find(s => s.id === sceneId))
    .filter(Boolean) as Scene[] || [];

  // Calculate total timeline duration
  const totalDuration = projectScenes.reduce((total, scene) => total + scene.duration, 0);

  // Check if any modal is open to disable keyboard shortcuts
  const isModalOpen = showExportModal || showExportProgress || showPropertiesModal || showEditModal || showCodeModal || !!contextMenu;

  // Find current scene for video sync
  const getCurrentScene = () => {
    let accumulatedTime = 0;
    for (const scene of projectScenes) {
      if (currentTime >= accumulatedTime && currentTime < accumulatedTime + scene.duration) {
        return { scene, sceneTime: currentTime - accumulatedTime };
      }
      accumulatedTime += scene.duration;
    }
    return null;
  };

  const currentSceneInfo = getCurrentScene();
  const hasVideoToSync = currentSceneInfo?.scene?.video_path && currentSceneInfo.scene.status === 'completed';

  const handlePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 5));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.2));
  };

  const handleTimeChange = (time: number) => {
    setCurrentTime(time);
  };

  const handleStepBackward = () => {
    const newTime = Math.max(0, currentTime - 1);
    setCurrentTime(newTime);
    setIsPlaying(false); // Pause when stepping
  };

  const handleStepForward = () => {
    const newTime = Math.min(totalDuration, currentTime + 1);
    setCurrentTime(newTime);
    setIsPlaying(false); // Pause when stepping
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onSpace: handlePlay,
    onLeftArrow: handleStepBackward,
    onRightArrow: handleStepForward,
    disabled: isModalOpen
  });

  // Enhanced handlers with undo/redo support
  const handleSceneDurationChange = async (sceneId: string, newDuration: number) => {
    const scene = projectScenes.find(s => s.id === sceneId);
    if (!scene || scene.duration === newDuration) return;

    const command = createSceneDurationCommand(
      sceneId,
      scene.duration,
      newDuration,
      async (id: string, duration: number) => {
        // TODO: Update scene duration via API
        console.log(`Update scene ${id} duration to ${duration}s`);
      }
    );

    try {
      await undoRedo.executeCommand(command);
    } catch (_error) {
      toast.error('Failed to change scene duration');
    }
  };

  const handleTransitionChange = async (sceneId: string, transitionId: string, duration: number) => {
    const oldTransition = transitions[sceneId] || { type: 'none', duration: 0 };
    const newTransition = { type: transitionId, duration };

    const command = createTransitionChangeCommand(
      sceneId,
      oldTransition,
      newTransition,
      async (id: string, type: string, dur: number) => {
        setTransitions(prev => ({
          ...prev,
          [id]: { id: `transition-${id}`, type, duration: dur }
        }));
      }
    );

    try {
      await undoRedo.executeCommand(command);
    } catch (_error) {
      toast.error('Failed to change transition');
    }
  };

  const handleExport = async () => {
    // Check if all scenes are completed
    const incompleteScenes = projectScenes.filter(scene => scene.status !== 'completed');
    if (incompleteScenes.length > 0) {
      toast.error(`${incompleteScenes.length} scenes are still processing. Please wait for all scenes to complete before exporting.`);
      return;
    }
    
    // Check if any scenes don't have video files
    const scenesWithoutVideo = projectScenes.filter(scene => !scene.video_path);
    if (scenesWithoutVideo.length > 0) {
      toast.error(`${scenesWithoutVideo.length} scenes don't have video files. Please regenerate these scenes.`);
      return;
    }
    
    // Advanced validation: check video health
    toast.loading('Validating scene videos...');
    let validationFailed = false;
    
    for (const scene of projectScenes) {
      try {
        const health = await sceneApi.checkHealth(scene.id);
        if (!health.valid) {
          toast.error(`Scene "${scene.prompt.substring(0, 30)}..." has invalid video: ${health.message}`);
          validationFailed = true;
          break;
        }
      } catch (_error) {
        toast.error(`Failed to validate scene "${scene.prompt.substring(0, 30)}..."`);
        validationFailed = true;
        break;
      }
    }
    
    toast.dismiss();
    
    if (validationFailed) {
      toast.error('Please fix scene issues before exporting.');
      return;
    }
    
    toast.success('All scenes validated successfully!');
    setShowExportModal(true);
  };

  const handleExportStart = async (config: { format: string; resolution: string; includeTransitions: boolean; transitionDuration: number }) => {
    try {
      const exportRequest = {
        project_id: projectId,
        format: config.format as 'mp4' | 'webm',
        resolution: config.resolution as '720p' | '1080p' | '4K',
        include_transitions: config.includeTransitions,
        transition_duration: config.transitionDuration
      };
      
      const response = await projectApi.exportProject(exportRequest);
      
      setCurrentExportId(response.export_id);
      setShowExportModal(false);
      setShowExportProgress(true);
      toast.success('Export started successfully!');
    } catch (_error) {
      toast.error('Failed to start export. Please try again.');
    }
  };

  const handleExportComplete = (_downloadUrl: string) => {
    toast.success('Export completed! Download ready.');
  };

  // Context menu handlers
  const handleContextMenu = (scene: Scene, position: { x: number; y: number }) => {
    setContextMenu({ scene, position });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const handleDuplicateScene = async (scene: Scene) => {
    try {
      await sceneApi.duplicate(scene.id);
      toast.success('Scene duplication started - check Scenes page for progress');
    } catch (error) {
      toast.error('Failed to duplicate scene');
    }
  };

  const handleDeleteSceneFromTimeline = async (scene: Scene) => {
    if (confirm('Are you sure you want to delete this scene? This action cannot be undone.')) {
      try {
        await deleteScene.mutateAsync(scene.id);
        // Remove scene from project
        if (project) {
          const updatedScenes = project.scenes.filter(id => id !== scene.id);
          await projectApi.update(project.id, {
            name: project.name,
            description: project.description,
            scenes: updatedScenes
          });
        }
        toast.success('Scene deleted from timeline');
      } catch (error) {
        toast.error('Failed to delete scene');
      }
    }
  };

  const handleEditScene = (scene: Scene) => {
    setSelectedModalScene(scene);
    setShowEditModal(true);
  };

  const handleRegenerateScene = async (scene: Scene) => {
    try {
      await regenerateScene.mutateAsync(scene.id);
      toast.success('Scene regeneration started');
    } catch (error) {
      toast.error('Failed to regenerate scene');
    }
  };

  const handleShowCode = (scene: Scene) => {
    setSelectedModalScene(scene);
    setShowCodeModal(true);
  };

  const handleShowProperties = (scene: Scene) => {
    setSelectedModalScene(scene);
    setShowPropertiesModal(true);
  };

  const handleSceneUpdate = async (sceneId: string, updates: any) => {
    try {
      await sceneApi.update(sceneId, updates);
      toast.success(updates.auto_regenerate ? 'Scene updated and regenerating...' : 'Scene updated successfully');
      setShowEditModal(false);
      // Refresh scenes data
      // Note: React Query will automatically refetch when the scene status changes
    } catch (error) {
      toast.error('Failed to update scene');
      throw error;
    }
  };

  if (projectLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-4 mx-auto"></div>
          <p>Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900 text-white">
        <div className="text-center">
          <p className="text-red-400 mb-4">Project not found</p>
          <Link
            to="/projects"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }


  // Show empty state if no scenes
  if (projectScenes.length === 0) {
    return (
      <div className="h-screen flex flex-col bg-gray-900 text-white">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                to={`/projects/${projectId}`}
                className="text-gray-400 hover:text-white"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-xl font-semibold">{project.name} - Timeline</h1>
            </div>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-400 mb-4">No scenes in this project yet.</p>
            <Link
              to={`/projects/${projectId}`}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium"
            >
              Add Scenes to Project
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              to={`/projects/${projectId}`}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-semibold">{project.name} - Timeline</h1>
          </div>
          
          {/* Header actions moved to toolbar */}
        </div>
      </div>

      {/* Timeline Toolbar */}
      <TimelineToolbar
        canUndo={undoRedo.canUndo}
        canRedo={undoRedo.canRedo}
        onUndo={undoRedo.undo}
        onRedo={undoRedo.redo}
        undoDescription={undoRedo.getUndoDescription()}
        redoDescription={undoRedo.getRedoDescription()}
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onExport={handleExport}
        hasSelectedScene={!!selectedSceneId}
        onDuplicateScene={() => {
          // TODO: Implement scene duplication
          console.log('Duplicate scene:', selectedSceneId);
        }}
        onDeleteScene={() => {
          // TODO: Implement scene deletion
          console.log('Delete scene:', selectedSceneId);
        }}
      />

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Scene Preview Panel */}
        <div className="w-80 bg-gray-800 border-r border-gray-700">
          <ScenePreview
            scenes={projectScenes}
            currentTime={currentTime}
            selectedSceneId={selectedSceneId}
            onSceneSelect={setSelectedSceneId}
            isPlaying={isPlaying}
            onTimeUpdate={setCurrentTime}
          />
        </div>

        {/* Timeline Area */}
        <div className="flex-1 flex flex-col">
          {/* Timeline Canvas */}
          <div className="flex-1 bg-gray-900 overflow-hidden">
            <TimelineCanvas
              scenes={projectScenes}
              currentTime={currentTime}
              totalDuration={totalDuration}
              zoom={zoom}
              selectedSceneId={selectedSceneId}
              onTimeChange={handleTimeChange}
              onSceneSelect={setSelectedSceneId}
              projectId={projectId!}
              transitions={transitions}
              onTransitionChange={handleTransitionChange}
              onDurationChange={handleSceneDurationChange}
              onContextMenu={handleContextMenu}
            />
          </div>

          {/* Playback Controls */}
          <div className="bg-gray-800 border-t border-gray-700">
            <PlaybackControls
              isPlaying={isPlaying}
              currentTime={currentTime}
              totalDuration={totalDuration}
              onPlay={handlePlay}
              onReset={handleReset}
              onTimeChange={handleTimeChange}
              syncWithVideo={Boolean(hasVideoToSync && !selectedSceneId)}
            />
          </div>
        </div>
      </div>

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExportStart}
        projectName={project.name}
        sceneCount={projectScenes.length}
        totalDuration={totalDuration}
        transitionCount={Object.values(transitions).filter(t => t.type !== 'none' && t.duration > 0).length}
        hasCustomTransitions={Object.keys(transitions).length > 0}
      />

      {/* Export Progress Modal */}
      <ExportProgress
        isOpen={showExportProgress}
        onClose={() => setShowExportProgress(false)}
        exportId={currentExportId || ''}
        projectName={project.name}
        onComplete={handleExportComplete}
      />

      {/* Scene Context Menu */}
      <SceneContextMenu
        scene={contextMenu?.scene || null}
        position={contextMenu?.position || null}
        onClose={handleCloseContextMenu}
        onDuplicate={handleDuplicateScene}
        onDelete={handleDeleteSceneFromTimeline}
        onEdit={handleEditScene}
        onRegenerate={handleRegenerateScene}
        onShowCode={handleShowCode}
        onShowProperties={handleShowProperties}
      />

      {/* Scene Properties Modal */}
      <ScenePropertiesModal
        scene={selectedModalScene}
        isOpen={showPropertiesModal}
        onClose={() => {
          setShowPropertiesModal(false);
          setSelectedModalScene(null);
        }}
      />

      {/* Scene Edit Modal */}
      <SceneEditModal
        scene={selectedModalScene}
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedModalScene(null);
        }}
        onSave={handleSceneUpdate}
      />

      {/* Code Viewer Modal */}
      <CodeViewerModal
        scene={selectedModalScene}
        isOpen={showCodeModal}
        onClose={() => {
          setShowCodeModal(false);
          setSelectedModalScene(null);
        }}
      />
    </div>
  );
}