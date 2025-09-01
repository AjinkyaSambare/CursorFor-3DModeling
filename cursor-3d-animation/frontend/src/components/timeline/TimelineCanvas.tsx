import { useState, useRef } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useReorderProjectScenes } from '../../hooks/useProjects';
import TransitionSelector from './TransitionSelector';
import { TRANSITION_TYPES } from '../../constants/transitions';
import type { Scene } from '../../types';

interface SceneTransition {
  id: string;
  type: string;
  duration: number;
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
  transitions?: Record<string, SceneTransition>;
  onTransitionChange?: (sceneId: string, transitionId: string, duration: number) => void;
  onDurationChange?: (sceneId: string, newDuration: number) => void;
  onContextMenu?: (scene: Scene, position: { x: number; y: number }) => void;
}

interface SceneBlockProps {
  scene: Scene;
  startTime: number;
  zoom: number;
  isSelected: boolean;
  onClick: () => void;
  onDurationChange?: (sceneId: string, newDuration: number) => void;
  onContextMenu?: (scene: Scene, position: { x: number; y: number }) => void;
}

function SceneBlock({ scene, startTime, zoom, isSelected, onClick, onDurationChange, onContextMenu }: SceneBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: scene.id });
  
  // Helper function to truncate scene name
  const truncateText = (text: string, maxLength: number = 30) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const [isResizing, setIsResizing] = useState(false);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [originalDuration, setOriginalDuration] = useState(scene.duration);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const width = scene.duration * 60 * zoom; // 60px per second base
  const left = startTime * 60 * zoom;

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeStartX(e.clientX);
    setOriginalDuration(scene.duration);

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStartX;
      const deltaDuration = deltaX / (60 * zoom);
      let newDuration = Math.max(1, Math.min(30, originalDuration + deltaDuration));
      newDuration = Math.round(newDuration * 10) / 10; // Round to 0.1 seconds
      
      // Update duration if changed significantly
      if (Math.abs(newDuration - scene.duration) > 0.1) {
        onDurationChange?.(scene.id, newDuration);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu?.(scene, { x: e.clientX, y: e.clientY });
  };

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, width: `${width}px`, left: `${left}px` }}
      className={`absolute h-16 rounded-lg border-2 cursor-pointer transition-all group ${
        isSelected
          ? 'border-blue-500 bg-blue-600'
          : 'border-gray-600 bg-gray-700 hover:bg-gray-600'
      } ${isDragging ? 'opacity-50' : ''} ${isResizing ? 'cursor-col-resize' : ''}`}
      onClick={onClick}
      onContextMenu={handleContextMenu}
      {...(isResizing ? {} : attributes)}
      {...(isResizing ? {} : listeners)}
    >
      <div className="p-2 h-full flex flex-col justify-between">
        <div className="text-sm font-medium text-white truncate" title={scene.prompt}>
          {truncateText(scene.original_prompt || scene.prompt, 25)}
        </div>
        <div className="text-xs text-gray-300">
          {scene.duration}s
        </div>
      </div>

      {/* Right resize handle */}
      <div
        className={`absolute right-0 top-0 bottom-0 w-2 cursor-col-resize bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity ${
          isSelected ? 'opacity-100' : ''
        }`}
        onMouseDown={handleResizeStart}
        title="Drag to resize scene duration"
      >
        <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-white rounded-full shadow-md" />
      </div>
      
      {/* Thumbnail overlay - disabled for now to avoid auth issues */}
    </div>
  );
}

interface TransitionBlockProps {
  transition: SceneTransition;
  startTime: number;
  zoom: number;
  onTransitionChange: (transitionId: string, duration: number) => void;
}

function TransitionBlock({ transition, startTime, zoom, onTransitionChange }: TransitionBlockProps) {
  const width = transition.duration * 60 * zoom;
  const left = startTime * 60 * zoom;
  const [showSelector, setShowSelector] = useState(false);

  if (transition.type === 'none' || transition.duration <= 0) {
    return null;
  }

  const transitionType = TRANSITION_TYPES.find(t => t.id === transition.type);
  const IconComponent = transitionType?.icon;

  return (
    <div className="relative">
      {/* Transition Block */}
      <div
        style={{ width: `${width}px`, left: `${left}px` }}
        className="absolute h-8 bg-gradient-to-r from-yellow-500 to-orange-500 rounded border border-yellow-400 cursor-pointer shadow-lg"
        onClick={() => setShowSelector(!showSelector)}
        title={`${transitionType?.name} transition (${transition.duration}s)`}
      >
        <div className="flex items-center justify-center h-full text-white text-xs font-medium">
          {IconComponent && <IconComponent className="w-3 h-3 mr-1" />}
          <span className="truncate">{transitionType?.name || 'Transition'}</span>
        </div>
      </div>

      {/* Transition Selector Popup */}
      {showSelector && (
        <div 
          className="absolute z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-4 min-w-64"
          style={{ 
            left: `${left}px`, 
            top: '-160px', // Position above the transition block
            transform: left + 256 > window.innerWidth ? 'translateX(-100%)' : 'none' 
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-white font-medium text-sm">Scene Transition</h4>
            <button
              onClick={() => setShowSelector(false)}
              className="text-gray-400 hover:text-white"
            >
              ×
            </button>
          </div>
          <TransitionSelector
            transitionId={transition.type}
            duration={transition.duration}
            onTransitionChange={(transitionId, duration) => {
              onTransitionChange(transitionId, duration);
              setShowSelector(false);
            }}
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
  transitions = {},
  onTransitionChange,
  onDurationChange,
  onContextMenu,
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

  // Calculate scene positions with transitions
  let currentPosition = 0;
  const scenePositions = scenes.map((scene, index) => {
    const position = currentPosition;
    currentPosition += scene.duration;
    
    // Add transition duration if not the last scene
    if (index < scenes.length - 1) {
      const transition = transitions[scene.id];
      if (transition && transition.duration > 0) {
        currentPosition += transition.duration;
      }
    }
    
    return { scene, startTime: position };
  });

  // Calculate transition positions
  const transitionPositions: Array<{ transition: SceneTransition; startTime: number; sceneId: string }> = [];
  scenes.forEach((scene, index) => {
    if (index < scenes.length - 1) {
      const transition = transitions[scene.id];
      if (transition && transition.duration > 0) {
        const scenePosition = scenePositions[index];
        transitionPositions.push({
          transition,
          startTime: scenePosition.startTime + scene.duration,
          sceneId: scene.id,
        });
      }
    }
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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = scenes.findIndex(scene => scene.id === String(active.id));
      const newIndex = scenes.findIndex(scene => scene.id === String(over.id));

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

  const handlePlayheadDrag = () => {
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

  const handleSceneContextMenu = (scene: Scene, position: { x: number; y: number }) => {
    onContextMenu?.(scene, position);
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
                {/* Render Scene Blocks */}
                {scenePositions.map(({ scene, startTime }) => (
                  <SceneBlock
                    key={scene.id}
                    scene={scene}
                    startTime={startTime}
                    zoom={zoom}
                    isSelected={selectedSceneId === scene.id}
                    onClick={() => onSceneSelect(scene.id)}
                    onDurationChange={onDurationChange}
                    onContextMenu={handleSceneContextMenu}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {/* Transition Blocks (separate layer) */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="relative h-20 mt-4">
              <div className="absolute top-16 left-0 right-0 h-8 pointer-events-auto">
                {transitionPositions.map(({ transition, startTime, sceneId }) => (
                  <TransitionBlock
                    key={`transition-${sceneId}`}
                    transition={transition}
                    startTime={startTime}
                    zoom={zoom}
                    onTransitionChange={(transitionId, duration) => {
                      onTransitionChange?.(sceneId, transitionId, duration);
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
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