import { useState, useCallback, useEffect } from 'react';

// Command interface
export interface Command {
  id: string;
  type: string;
  description: string;
  execute: () => Promise<void> | void;
  undo: () => Promise<void> | void;
  timestamp: number;
}

// Timeline-specific command types
export interface SceneReorderCommand extends Command {
  type: 'scene_reorder';
  oldOrder: string[];
  newOrder: string[];
}

export interface SceneDurationCommand extends Command {
  type: 'scene_duration';
  sceneId: string;
  oldDuration: number;
  newDuration: number;
}

export interface TransitionChangeCommand extends Command {
  type: 'transition_change';
  sceneId: string;
  oldTransition: { type: string; duration: number };
  newTransition: { type: string; duration: number };
}

export interface SceneDeleteCommand extends Command {
  type: 'scene_delete';
  scene: unknown;
  position: number;
}

export interface SceneAddCommand extends Command {
  type: 'scene_add';
  scene: unknown;
  position: number;
}

export type TimelineCommand = 
  | SceneReorderCommand 
  | SceneDurationCommand 
  | TransitionChangeCommand
  | SceneDeleteCommand
  | SceneAddCommand;

interface UndoRedoState {
  undoStack: Command[];
  redoStack: Command[];
  maxHistorySize: number;
}

interface UndoRedoActions {
  executeCommand: (command: Command) => Promise<void>;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  canUndo: boolean;
  canRedo: boolean;
  clearHistory: () => void;
  getUndoDescription: () => string | null;
  getRedoDescription: () => string | null;
}

export function useUndoRedo(maxHistorySize = 50): UndoRedoActions {
  const [state, setState] = useState<UndoRedoState>({
    undoStack: [],
    redoStack: [],
    maxHistorySize,
  });

  const executeCommand = useCallback(async (command: Command) => {
    try {
      // Execute the command
      await command.execute();

      setState(prev => {
        const newUndoStack = [...prev.undoStack, command];
        
        // Limit history size
        if (newUndoStack.length > prev.maxHistorySize) {
          newUndoStack.shift();
        }

        return {
          ...prev,
          undoStack: newUndoStack,
          redoStack: [], // Clear redo stack when new command is executed
        };
      });
    } catch (error) {
      console.error('Failed to execute command:', error);
      throw error;
    }
  }, []);

  const undo = useCallback(async () => {
    if (state.undoStack.length === 0) return;

    const command = state.undoStack[state.undoStack.length - 1];
    
    try {
      await command.undo();
      
      setState(prev => ({
        ...prev,
        undoStack: prev.undoStack.slice(0, -1),
        redoStack: [...prev.redoStack, command],
      }));
    } catch (error) {
      console.error('Failed to undo command:', error);
      throw error;
    }
  }, [state.undoStack]);

  const redo = useCallback(async () => {
    if (state.redoStack.length === 0) return;

    const command = state.redoStack[state.redoStack.length - 1];
    
    try {
      await command.execute();
      
      setState(prev => ({
        ...prev,
        undoStack: [...prev.undoStack, command],
        redoStack: prev.redoStack.slice(0, -1),
      }));
    } catch (error) {
      console.error('Failed to redo command:', error);
      throw error;
    }
  }, [state.redoStack]);

  const clearHistory = useCallback(() => {
    setState(prev => ({
      ...prev,
      undoStack: [],
      redoStack: [],
    }));
  }, []);

  const getUndoDescription = useCallback(() => {
    const lastCommand = state.undoStack[state.undoStack.length - 1];
    return lastCommand ? lastCommand.description : null;
  }, [state.undoStack]);

  const getRedoDescription = useCallback(() => {
    const nextCommand = state.redoStack[state.redoStack.length - 1];
    return nextCommand ? nextCommand.description : null;
  }, [state.redoStack]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Cmd/Ctrl + Z (undo)
      if ((event.metaKey || event.ctrlKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        if (state.undoStack.length > 0) {
          undo();
        }
      }
      
      // Check for Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y (redo)
      if (
        ((event.metaKey || event.ctrlKey) && event.key === 'z' && event.shiftKey) ||
        ((event.metaKey || event.ctrlKey) && event.key === 'y')
      ) {
        event.preventDefault();
        if (state.redoStack.length > 0) {
          redo();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, state.undoStack.length, state.redoStack.length]);

  return {
    executeCommand,
    undo,
    redo,
    canUndo: state.undoStack.length > 0,
    canRedo: state.redoStack.length > 0,
    clearHistory,
    getUndoDescription,
    getRedoDescription,
  };
}

// Helper functions to create specific timeline commands
export function createSceneReorderCommand(
  oldOrder: string[],
  newOrder: string[],
  onReorder: (order: string[]) => Promise<void>
): SceneReorderCommand {
  return {
    id: `reorder_${Date.now()}`,
    type: 'scene_reorder',
    description: 'Reorder scenes',
    oldOrder,
    newOrder,
    timestamp: Date.now(),
    execute: () => onReorder(newOrder),
    undo: () => onReorder(oldOrder),
  };
}

export function createSceneDurationCommand(
  sceneId: string,
  oldDuration: number,
  newDuration: number,
  onDurationChange: (sceneId: string, duration: number) => Promise<void>
): SceneDurationCommand {
  return {
    id: `duration_${sceneId}_${Date.now()}`,
    type: 'scene_duration',
    description: `Change scene duration to ${newDuration}s`,
    sceneId,
    oldDuration,
    newDuration,
    timestamp: Date.now(),
    execute: () => onDurationChange(sceneId, newDuration),
    undo: () => onDurationChange(sceneId, oldDuration),
  };
}

export function createTransitionChangeCommand(
  sceneId: string,
  oldTransition: { type: string; duration: number },
  newTransition: { type: string; duration: number },
  onTransitionChange: (sceneId: string, transitionId: string, duration: number) => Promise<void>
): TransitionChangeCommand {
  return {
    id: `transition_${sceneId}_${Date.now()}`,
    type: 'transition_change',
    description: `Change transition to ${newTransition.type}`,
    sceneId,
    oldTransition,
    newTransition,
    timestamp: Date.now(),
    execute: () => onTransitionChange(sceneId, newTransition.type, newTransition.duration),
    undo: () => onTransitionChange(sceneId, oldTransition.type, oldTransition.duration),
  };
}