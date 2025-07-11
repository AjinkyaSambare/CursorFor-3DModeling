import { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, SkipBack, SkipForward } from 'lucide-react';

interface PlaybackControlsProps {
  isPlaying: boolean;
  currentTime: number;
  totalDuration: number;
  onPlay: () => void;
  onReset: () => void;
  onTimeChange: (time: number) => void;
}

export default function PlaybackControls({
  isPlaying,
  currentTime,
  totalDuration,
  onPlay,
  onReset,
  onTimeChange,
}: PlaybackControlsProps) {
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Auto-advance time when playing
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      const newTime = currentTime + (0.1 * playbackSpeed);
      if (newTime >= totalDuration) {
        onPlay(); // Stop playing
        onTimeChange(totalDuration);
      } else {
        onTimeChange(newTime);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, totalDuration, currentTime, onTimeChange, onPlay]);

  const handleSkipBack = () => {
    onTimeChange(Math.max(0, currentTime - 5));
  };

  const handleSkipForward = () => {
    onTimeChange(Math.min(totalDuration, currentTime + 5));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleScrubChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = (parseFloat(e.target.value) / 100) * totalDuration;
    onTimeChange(time);
  };

  const progressPercentage = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className="px-6 py-4 bg-gray-800">
      <div className="flex items-center justify-between">
        {/* Left Controls */}
        <div className="flex items-center space-x-4">
          {/* Main Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onReset}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Reset to beginning"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            
            <button
              onClick={handleSkipBack}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Skip back 5 seconds"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              onClick={onPlay}
              className="p-3 bg-blue-600 hover:bg-blue-700 rounded-full text-white transition-colors"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" />
              )}
            </button>

            <button
              onClick={handleSkipForward}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Skip forward 5 seconds"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

          {/* Speed Control */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-400">Speed:</span>
            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
              className="bg-gray-700 text-white text-sm rounded px-2 py-1 border border-gray-600"
            >
              <option value={0.25}>0.25x</option>
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={1.5}>1.5x</option>
              <option value={2}>2x</option>
            </select>
          </div>
        </div>

        {/* Center - Progress Bar */}
        <div className="flex-1 mx-8">
          <div className="relative">
            <input
              type="range"
              min="0"
              max="100"
              value={progressPercentage}
              onChange={handleScrubChange}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer timeline-scrubber"
            />
            <div
              className="absolute top-0 h-2 bg-blue-600 rounded-lg pointer-events-none"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Right - Time Display */}
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-300 font-mono">
            {formatTime(currentTime)} / {formatTime(totalDuration)}
          </div>
        </div>
      </div>

    </div>
  );
}