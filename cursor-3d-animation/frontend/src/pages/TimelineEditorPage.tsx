import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ZoomIn, ZoomOut, Download } from 'lucide-react';
import { useProject } from '../hooks/useProjects';
import { useScenes } from '../hooks/useScenes';
import { projectApi, sceneApi } from '../services/api';
import TimelineCanvas from '../components/timeline/TimelineCanvas';
import PlaybackControls from '../components/timeline/PlaybackControls';
import ScenePreview from '../components/timeline/ScenePreview';
import ExportModal from '../components/export/ExportModal';
import ExportProgress from '../components/export/ExportProgress';
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
  metadata: Record<string, any>;
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
  
  const { data: project, isLoading: projectLoading } = useProject(projectId!);
  const { data: scenesData } = useScenes();

  // Get full scene objects for this project
  const projectScenes = project?.scenes
    .map(sceneId => scenesData?.scenes.find(s => s.id === sceneId))
    .filter(Boolean) as Scene[] || [];

  // Calculate total timeline duration
  const totalDuration = projectScenes.reduce((total, scene) => total + scene.duration, 0);

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
      } catch (error) {
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

  const handleExportStart = async (config: any) => {
    try {
      const exportRequest = {
        project_id: projectId,
        format: config.format,
        resolution: config.resolution,
        include_transitions: config.includeTransitions,
        transition_duration: config.transitionDuration
      };
      
      const response = await projectApi.exportProject(exportRequest);
      
      setCurrentExportId(response.export_id);
      setShowExportModal(false);
      setShowExportProgress(true);
      toast.success('Export started successfully!');
    } catch (error) {
      toast.error('Failed to start export. Please try again.');
    }
  };

  const handleExportComplete = (downloadUrl: string) => {
    toast.success('Export completed! Download ready.');
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
          
          <div className="flex items-center space-x-4">
            {/* Zoom Controls */}
            <div className="flex items-center space-x-2 bg-gray-700 rounded-lg px-3 py-1">
              <button
                onClick={handleZoomOut}
                className="text-gray-300 hover:text-white"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="text-gray-300 hover:text-white"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* Export Button */}
            <button
              onClick={handleExport}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Scene Preview Panel */}
        <div className="w-80 bg-gray-800 border-r border-gray-700">
          <ScenePreview
            scenes={projectScenes}
            currentTime={currentTime}
            selectedSceneId={selectedSceneId}
            onSceneSelect={setSelectedSceneId}
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
      />

      {/* Export Progress Modal */}
      <ExportProgress
        isOpen={showExportProgress}
        onClose={() => setShowExportProgress(false)}
        exportId={currentExportId || ''}
        projectName={project.name}
        onComplete={handleExportComplete}
      />
    </div>
  );
}