import { Undo, Redo, ZoomIn, ZoomOut, Download, Scissors, Copy, Trash2 } from 'lucide-react';

interface TimelineToolbarProps {
  // Undo/Redo
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  undoDescription?: string | null;
  redoDescription?: string | null;
  
  // Zoom
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  
  // Actions
  onExport: () => void;
  
  // Selected scene actions
  hasSelectedScene: boolean;
  onDuplicateScene?: () => void;
  onDeleteScene?: () => void;
  onSplitScene?: () => void;
  
  className?: string;
}

export default function TimelineToolbar({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  undoDescription,
  redoDescription,
  zoom,
  onZoomIn,
  onZoomOut,
  onExport,
  hasSelectedScene,
  onDuplicateScene,
  onDeleteScene,
  onSplitScene,
  className = '',
}: TimelineToolbarProps) {
  return (
    <div className={`flex items-center justify-between bg-gray-800 border-b border-gray-700 px-4 py-2 ${className}`}>
      {/* Left: Undo/Redo */}
      <div className="flex items-center space-x-1">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`p-2 rounded hover:bg-gray-700 transition-colors ${
            canUndo ? 'text-white' : 'text-gray-500 cursor-not-allowed'
          }`}
          title={undoDescription ? `Undo: ${undoDescription}` : 'Undo (Ctrl+Z)'}
        >
          <Undo className="w-4 h-4" />
        </button>
        
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={`p-2 rounded hover:bg-gray-700 transition-colors ${
            canRedo ? 'text-white' : 'text-gray-500 cursor-not-allowed'
          }`}
          title={redoDescription ? `Redo: ${redoDescription}` : 'Redo (Ctrl+Shift+Z)'}
        >
          <Redo className="w-4 h-4" />
        </button>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-600 mx-2" />

        {/* Scene Actions (only visible when scene is selected) */}
        {hasSelectedScene && (
          <>
            <button
              onClick={onDuplicateScene}
              className="p-2 rounded hover:bg-gray-700 text-white transition-colors"
              title="Duplicate scene (Ctrl+D)"
            >
              <Copy className="w-4 h-4" />
            </button>
            
            {onSplitScene && (
              <button
                onClick={onSplitScene}
                className="p-2 rounded hover:bg-gray-700 text-white transition-colors"
                title="Split scene at playhead"
              >
                <Scissors className="w-4 h-4" />
              </button>
            )}
            
            <button
              onClick={onDeleteScene}
              className="p-2 rounded hover:bg-red-700 text-red-400 transition-colors"
              title="Delete scene (Delete)"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <div className="h-6 w-px bg-gray-600 mx-2" />
          </>
        )}
      </div>

      {/* Center: History and Status */}
      <div className="flex items-center space-x-4 text-sm text-gray-400">
        {(canUndo || canRedo) && (
          <div className="flex items-center space-x-2">
            {canUndo && undoDescription && (
              <span className="text-xs">Last: {undoDescription}</span>
            )}
            {(canUndo || canRedo) && (
              <span className="text-xs">
                History: {canUndo ? '●' : '○'} {canRedo ? '○' : ''}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right: Zoom and Export */}
      <div className="flex items-center space-x-1">
        {/* Zoom Controls */}
        <div className="flex items-center space-x-1 bg-gray-700 rounded-lg px-2 py-1">
          <button
            onClick={onZoomOut}
            className="p-1 text-gray-300 hover:text-white rounded hover:bg-gray-600 transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          
          <span className="text-sm font-medium text-white min-w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          
          <button
            onClick={onZoomIn}
            className="p-1 text-gray-300 hover:text-white rounded hover:bg-gray-600 transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-600 mx-2" />

        {/* Export Button */}
        <button
          onClick={onExport}
          className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg font-medium flex items-center space-x-2 text-white transition-colors"
          title="Export timeline"
        >
          <Download className="w-4 h-4" />
          <span>Export</span>
        </button>
      </div>
    </div>
  );
}