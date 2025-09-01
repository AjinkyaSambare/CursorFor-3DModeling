import { useEffect, useRef } from 'react';
import { Copy, Trash2, Edit3, Eye, RotateCcw, Settings } from 'lucide-react';

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

interface SceneContextMenuProps {
  scene: Scene | null;
  position: { x: number; y: number } | null;
  onClose: () => void;
  onDuplicate?: (scene: Scene) => void;
  onDelete?: (scene: Scene) => void;
  onEdit?: (scene: Scene) => void;
  onRegenerate?: (scene: Scene) => void;
  onShowCode?: (scene: Scene) => void;
  onShowProperties?: (scene: Scene) => void;
}

export default function SceneContextMenu({
  scene,
  position,
  onClose,
  onDuplicate,
  onDelete,
  onEdit,
  onRegenerate,
  onShowCode,
  onShowProperties,
}: SceneContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (position) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [position, onClose]);

  if (!position || !scene) {
    return null;
  }

  // Adjust position to keep menu on screen
  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 200),
    y: Math.min(position.y, window.innerHeight - 300),
  };

  const menuItems = [
    {
      icon: Eye,
      label: 'Show Properties',
      onClick: () => {
        onShowProperties?.(scene);
        onClose();
      },
    },
    {
      icon: Edit3,
      label: 'Edit Scene',
      onClick: () => {
        onEdit?.(scene);
        onClose();
      },
      disabled: scene.status === 'processing' || scene.status === 'rendering',
    },
    {
      icon: Copy,
      label: 'Duplicate Scene',
      onClick: () => {
        onDuplicate?.(scene);
        onClose();
      },
    },
    {
      icon: RotateCcw,
      label: 'Regenerate',
      onClick: () => {
        onRegenerate?.(scene);
        onClose();
      },
      disabled: scene.status === 'processing' || scene.status === 'rendering',
    },
    {
      type: 'separator' as const,
    },
    {
      icon: Settings,
      label: 'View Generated Code',
      onClick: () => {
        onShowCode?.(scene);
        onClose();
      },
      disabled: !scene.generated_code,
    },
    {
      type: 'separator' as const,
    },
    {
      icon: Trash2,
      label: 'Delete Scene',
      onClick: () => {
        onDelete?.(scene);
        onClose();
      },
      className: 'text-red-400 hover:text-red-300 hover:bg-red-900/20',
      dangerous: true,
    },
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-xl py-1 min-w-48"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
    >
      {/* Scene Info Header */}
      <div className="px-3 py-2 border-b border-gray-700">
        <div className="text-sm font-medium text-white truncate">
          {scene.prompt}
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {scene.duration}s • {scene.library.toUpperCase()} • {scene.status}
        </div>
      </div>

      {/* Menu Items */}
      {menuItems.map((item, index) => {
        if (item.type === 'separator') {
          return (
            <div key={index} className="h-px bg-gray-700 my-1" />
          );
        }

        const IconComponent = item.icon;
        const isDisabled = item.disabled;

        return (
          <button
            key={index}
            onClick={item.onClick}
            disabled={isDisabled}
            className={`
              w-full flex items-center px-3 py-2 text-sm transition-colors text-left
              ${isDisabled 
                ? 'text-gray-500 cursor-not-allowed' 
                : item.className || 'text-gray-200 hover:text-white hover:bg-gray-700'
              }
            `}
          >
            <IconComponent className="w-4 h-4 mr-3" />
            <span>{item.label}</span>
            
            {/* Status indicator for processing scenes */}
            {(scene.status === 'processing' || scene.status === 'rendering') && 
             (item.label === 'Edit Scene' || item.label === 'Regenerate') && (
              <div className="ml-auto">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}