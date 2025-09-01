import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { TRANSITION_TYPES, type TransitionType } from '../../constants/transitions';

interface TransitionSelectorProps {
  transitionId: string;
  duration?: number;
  onTransitionChange: (transitionId: string, duration: number) => void;
  disabled?: boolean;
  className?: string;
}

export default function TransitionSelector({
  transitionId,
  duration,
  onTransitionChange,
  disabled = false,
  className = '',
}: TransitionSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customDuration, setCustomDuration] = useState(duration || 0.5);

  const selectedTransition = TRANSITION_TYPES.find(t => t.id === transitionId) || TRANSITION_TYPES[0];

  const handleTransitionSelect = (transition: TransitionType) => {
    setIsOpen(false);
    setCustomDuration(transition.duration);
    onTransitionChange(transition.id, transition.duration);
  };

  const handleDurationChange = (newDuration: number) => {
    setCustomDuration(newDuration);
    onTransitionChange(transitionId, newDuration);
  };

  const IconComponent = selectedTransition.icon;

  return (
    <div className={`relative ${className}`}>
      {/* Transition Type Selector */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          className={`
            w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm
            flex items-center justify-between transition-colors
            ${disabled 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500'
            }
          `}
        >
          <div className="flex items-center space-x-2">
            <IconComponent className="w-4 h-4" />
            <span>{selectedTransition.name}</span>
          </div>
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
            {TRANSITION_TYPES.map((transition) => {
              const TransitionIcon = transition.icon;
              const isSelected = transition.id === transitionId;

              return (
                <button
                  key={transition.id}
                  onClick={() => handleTransitionSelect(transition)}
                  className={`
                    w-full px-3 py-2 text-left hover:bg-gray-600 text-white text-sm
                    flex items-center space-x-2 transition-colors
                    ${isSelected ? 'bg-blue-600 hover:bg-blue-700' : ''}
                  `}
                >
                  <TransitionIcon className="w-4 h-4" />
                  <div>
                    <div className="font-medium">{transition.name}</div>
                    <div className="text-xs text-gray-300">{transition.description}</div>
                  </div>
                  {transition.duration > 0 && (
                    <div className="ml-auto text-xs text-gray-400">
                      {transition.duration}s
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Duration Slider (only show if transition is not 'none') */}
      {transitionId !== 'none' && (
        <div className="mt-3">
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Duration: {customDuration.toFixed(1)}s
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="range"
              min="0.1"
              max="3.0"
              step="0.1"
              value={customDuration}
              onChange={(e) => handleDurationChange(parseFloat(e.target.value))}
              disabled={disabled}
              className={`
                flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              style={{
                background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${((customDuration - 0.1) / 2.9) * 100}%, #4B5563 ${((customDuration - 0.1) / 2.9) * 100}%, #4B5563 100%)`
              }}
            />
            <span className="text-xs text-gray-400 w-8 text-right">3.0s</span>
          </div>
        </div>
      )}

      {/* Preview indicator */}
      {transitionId !== 'none' && (
        <div className="mt-2 text-xs text-gray-500">
          Transition will be applied between scenes
        </div>
      )}
    </div>
  );
}