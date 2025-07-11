import { useState } from 'react';
import { X, Download, Settings, Film, Zap } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (config: ExportConfig) => void;
  projectName: string;
  sceneCount: number;
  totalDuration: number;
  isExporting?: boolean;
}

interface ExportConfig {
  format: 'mp4' | 'webm';
  resolution: '720p' | '1080p' | '4K';
  includeTransitions: boolean;
  transitionDuration: number;
}

export default function ExportModal({ 
  isOpen, 
  onClose, 
  onExport, 
  projectName, 
  sceneCount, 
  totalDuration,
  isExporting = false
}: ExportModalProps) {
  const [config, setConfig] = useState<ExportConfig>({
    format: 'mp4',
    resolution: '1080p',
    includeTransitions: true,
    transitionDuration: 0.5
  });

  const handleExport = () => {
    onExport(config);
  };

  const formatOptions = [
    { value: 'mp4', label: 'MP4', description: 'Best compatibility' },
    { value: 'webm', label: 'WebM', description: 'Smaller file size' }
  ];

  const resolutionOptions = [
    { value: '720p', label: '720p HD', description: '1280×720, faster export' },
    { value: '1080p', label: '1080p Full HD', description: '1920×1080, recommended' },
    { value: '4K', label: '4K Ultra HD', description: '3840×2160, highest quality' }
  ];

  const estimatedFileSize = () => {
    const baseSize = totalDuration * 2; // MB per second baseline
    const resolutionMultiplier = {
      '720p': 0.5,
      '1080p': 1.0,
      '4K': 4.0
    };
    return Math.round(baseSize * resolutionMultiplier[config.resolution]);
  };

  const estimatedExportTime = () => {
    const baseTime = totalDuration * 0.5; // seconds per second of video
    const resolutionMultiplier = {
      '720p': 0.5,
      '1080p': 1.0,
      '4K': 3.0
    };
    const transitionMultiplier = config.includeTransitions ? 1.5 : 1.0;
    return Math.round(baseTime * resolutionMultiplier[config.resolution] * transitionMultiplier);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {/* Header */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                  <Download className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Export Project
                  </h3>
                  <p className="text-sm text-gray-500">
                    {projectName}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
                disabled={isExporting}
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Project Summary */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <Film className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">{sceneCount} scenes</span>
                </div>
                <div className="flex items-center">
                  <Zap className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">{totalDuration}s total</span>
                </div>
              </div>
            </div>

            {/* Export Configuration */}
            <div className="space-y-6">
              {/* Format Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  <Settings className="inline h-4 w-4 mr-2" />
                  Format
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {formatOptions.map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                        config.format === option.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="format"
                        value={option.value}
                        checked={config.format === option.value}
                        onChange={(e) => setConfig({ ...config, format: e.target.value as 'mp4' | 'webm' })}
                        className="sr-only"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{option.label}</div>
                        <div className="text-sm text-gray-500">{option.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Resolution Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Resolution
                </label>
                <div className="space-y-2">
                  {resolutionOptions.map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                        config.resolution === option.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="resolution"
                        value={option.value}
                        checked={config.resolution === option.value}
                        onChange={(e) => setConfig({ ...config, resolution: e.target.value as '720p' | '1080p' | '4K' })}
                        className="sr-only"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{option.label}</div>
                        <div className="text-sm text-gray-500">{option.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Transitions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Transitions
                </label>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.includeTransitions}
                      onChange={(e) => setConfig({ ...config, includeTransitions: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Add smooth transitions between scenes</span>
                  </label>
                  
                  {config.includeTransitions && (
                    <div className="ml-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Transition Duration
                      </label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="range"
                          min="0.2"
                          max="2.0"
                          step="0.1"
                          value={config.transitionDuration}
                          onChange={(e) => setConfig({ ...config, transitionDuration: parseFloat(e.target.value) })}
                          className="flex-1"
                        />
                        <span className="text-sm text-gray-600 w-12">
                          {config.transitionDuration}s
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Export Estimates */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Export Estimates</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>File size:</span>
                    <span>~{estimatedFileSize()} MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Export time:</span>
                    <span>~{Math.floor(estimatedExportTime() / 60)}:{(estimatedExportTime() % 60).toString().padStart(2, '0')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Start Export
                </>
              )}
            </button>
            <button
              onClick={onClose}
              disabled={isExporting}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}