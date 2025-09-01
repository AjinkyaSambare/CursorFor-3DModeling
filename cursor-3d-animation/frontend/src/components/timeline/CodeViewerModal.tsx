import { useState, useEffect } from 'react';
import { X, Copy, Check, Download } from 'lucide-react';
import type { Scene } from '../../types';
import { sceneApi } from '../../services/api';

interface CodeViewerModalProps {
  scene: Scene | null;
  isOpen: boolean;
  onClose: () => void;
}

interface CodeData {
  code: string;
  language: string;
  filename: string;
}

export default function CodeViewerModal({ scene, isOpen, onClose }: CodeViewerModalProps) {
  const [codeData, setCodeData] = useState<CodeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Load code when modal opens
  useEffect(() => {
    if (isOpen && scene) {
      loadCode();
    }
  }, [isOpen, scene]);

  const loadCode = async () => {
    if (!scene) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await sceneApi.getCode(scene.id);
      setCodeData({
        code: data.code,
        language: data.language,
        filename: `scene_${scene.id}.py`
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (codeData) {
      navigator.clipboard.writeText(codeData.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!codeData) return;
    
    const blob = new Blob([codeData.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = codeData.filename || `scene_${scene?.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getLanguageLabel = (language: string) => {
    switch (language.toLowerCase()) {
      case 'manim':
        return 'Python (Manim)';
      case 'threejs':
        return 'JavaScript (Three.js)';
      case 'p5js':
        return 'JavaScript (p5.js)';
      default:
        return language.charAt(0).toUpperCase() + language.slice(1);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Generated Code</h2>
            {scene && (
              <p className="text-sm text-gray-500 mt-1">
                Scene: {scene.prompt.substring(0, 60)}...
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Code Content */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-red-600 mb-4">{error}</p>
                <button
                  onClick={loadCode}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : codeData ? (
            <div className="h-full flex flex-col">
              {/* Code Header */}
              <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-gray-700">
                    {getLanguageLabel(codeData.language)}
                  </span>
                  <span className="text-sm text-gray-500">
                    {codeData.filename}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center space-x-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-green-500" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center space-x-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </button>
                </div>
              </div>

              {/* Code Display */}
              <div className="flex-1 overflow-auto p-6 bg-gray-900" style={{ maxHeight: 'calc(90vh - 200px)' }}>
                <pre className="text-sm text-gray-100 font-mono leading-relaxed whitespace-pre-wrap break-words">
                  <code>{codeData.code}</code>
                </pre>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}