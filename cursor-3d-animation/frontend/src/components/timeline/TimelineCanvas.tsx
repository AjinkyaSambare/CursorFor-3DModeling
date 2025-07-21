import { useState, useRef } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useReorderProjectScenes } from '../../hooks/useProjects';
import { sceneApi } from '../../services/api';

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

interface TimelineCanvasProps {
  scenes: Scene[];
  currentTime: number;
  totalDuration: number;
  zoom: number;
  selectedSceneId: string | null;
  onTimeChange: (time: number) => void;
  onSceneSelect: (sceneId: string | null) => void;
  projectId: string;
}

interface SceneBlockProps {
  scene: Scene;
  startTime: number;
  zoom: number;
  isSelected: boolean;
  onClick: () => void;
}

function SceneBlock({ scene, startTime, zoom, isSelected, onClick }: SceneBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: scene.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const width = scene.duration * 60 * zoom; // 60px per second base
  const left = startTime * 60 * zoom;

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, width: `${width}px`, left: `${left}px` }}
      className={`absolute h-16 rounded-lg border-2 cursor-pointer transition-all ${
        isSelected
          ? 'border-blue-500 bg-blue-600'
          : 'border-gray-600 bg-gray-700 hover:bg-gray-600'
      } ${isDragging ? 'opacity-50' : ''}`}
      onClick={onClick}
      {...attributes}
      {...listeners}
    >
      <div className="p-2 h-full flex flex-col justify-between">
        <div className="text-sm font-medium text-white truncate">
          {scene.prompt}
        </div>
        <div className="text-xs text-gray-300">
          {scene.duration}s
        </div>
      </div>
      
      {/* Thumbnail overlay - disabled for now to avoid auth issues */}
      {scene.video_path && false && (
        <div className="absolute inset-0 rounded-lg overflow-hidden opacity-20">
          <video
            src={sceneApi.getVideoUrl(scene.id)}
            className="w-full h-full object-cover"
            muted
            preload="metadata"
          />
        </div>
      )}
    </div>
  );
}

export default function TimelineCanvas({
  scenes,
  currentTime,
  totalDuration,
  zoom,
  selectedSceneId,
  onTimeChange,
  onSceneSelect,
  projectId,
}: TimelineCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const reorderScenes = useReorderProjectScenes(projectId);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Calculate scene positions
  let currentPosition = 0;
  const scenePositions = scenes.map(scene => {
    const position = currentPosition;
    currentPosition += scene.duration;
    return { scene, startTime: position };
  });

  const timelineWidth = Math.max(totalDuration * 60 * zoom, 800);
  const playheadPosition = currentTime * 60 * zoom;

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (isDraggingPlayhead) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const time = Math.max(0, Math.min(x / (60 * zoom), totalDuration));
    onTimeChange(time);
    
    // Check if clicked on a scene
    const clickedScene = scenePositions.find(({ scene, startTime }) => {
      const sceneEnd = startTime + scene.duration;
      return time >= startTime && time <= sceneEnd;
    });

    onSceneSelect(clickedScene?.scene.id || null);
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = scenes.findIndex(scene => scene.id === active.id);
      const newIndex = scenes.findIndex(scene => scene.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(scenes.map(s => s.id), oldIndex, newIndex);
        try {
          await reorderScenes.mutateAsync(newOrder);
        } catch (error) {
          console.error('Failed to reorder scenes:', error);
        }
      }
    }
  };

  const handlePlayheadDrag = (e: React.MouseEvent) => {
    setIsDraggingPlayhead(true);
    
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const time = Math.max(0, Math.min(x / (60 * zoom), totalDuration));
      onTimeChange(time);
    };

    const handleMouseUp = () => {
      setIsDraggingPlayhead(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="h-full overflow-auto bg-gray-900">
      {/* Timeline Ruler */}
      <div className="h-8 bg-gray-800 border-b border-gray-700 relative">
        <div style={{ width: `${timelineWidth}px` }}>
          {Array.from({ length: Math.ceil(totalDuration) + 1 }, (_, i) => (
            <div
              key={i}
              className="absolute border-l border-gray-600 h-full"
              style={{ left: `${i * 60 * zoom}px` }}
            >
              <span className="text-xs text-gray-400 ml-1 mt-1 block">
                {i}s
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Timeline Area */}
      <div
        ref={canvasRef}
        className="relative bg-gray-900 cursor-crosshair"
        style={{ 
          height: 'calc(100% - 2rem)',
          width: `${timelineWidth}px`,
          minHeight: '200px'
        }}
        onClick={handleCanvasClick}
      >
        {/* Scene Tracks */}
        <div className="absolute inset-0">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={scenes.map(s => s.id)}
              strategy={horizontalListSortingStrategy}
            >
              <div className="relative h-20 mt-4">
                {scenePositions.map(({ scene, startTime }) => (
                  <SceneBlock
                    key={scene.id}
                    scene={scene}
                    startTime={startTime}
                    zoom={zoom}
                    isSelected={selectedSceneId === scene.id}
                    onClick={() => onSceneSelect(scene.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 cursor-col-resize z-10"
          style={{ left: `${playheadPosition}px` }}
          onMouseDown={handlePlayheadDrag}
        >
          <div className="w-3 h-3 bg-red-500 rounded-full -translate-x-1/2 -translate-y-1/2 absolute top-0 cursor-col-resize" />
        </div>

        {/* Time Markers */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: Math.ceil(totalDuration) + 1 }, (_, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 border-l border-gray-700 opacity-50"
              style={{ left: `${i * 60 * zoom}px` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}