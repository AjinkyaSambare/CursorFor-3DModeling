import { useState, useEffect } from 'react';
import { Download, CheckCircle, XCircle, Loader2, X } from 'lucide-react';
import { projectApi } from '../../services/api';

interface ExportProgressProps {
  isOpen: boolean;
  onClose: () => void;
  exportId: string;
  projectName?: string;
  onComplete?: (downloadUrl: string) => void;
}

interface ExportStatus {
  export_id: string;
  status: 'pending' | 'processing' | 'combining' | 'finalizing' | 'completed' | 'failed';
  progress: number;
  error_message?: string;
  created_at: string;
  completed_at?: string;
  download_url?: string;
}

export default function ExportProgress({ 
  isOpen, 
  onClose, 
  exportId, 
  projectName = "animation",
  onComplete 
}: ExportProgressProps) {
  const [status, setStatus] = useState<ExportStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !exportId) return;

    const checkStatus = async () => {
      try {
        const data = await projectApi.getExportStatus(exportId);
        setStatus(data);

        // Call onComplete when export is finished
        if (data.status === 'completed' && data.download_url && onComplete) {
          onComplete(data.download_url);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to check export status');
      }
    };

    // Check immediately
    checkStatus();

    // Poll every 2 seconds while processing
    const interval = setInterval(() => {
      if (status?.status === 'completed' || status?.status === 'failed') {
        clearInterval(interval);
        return;
      }
      checkStatus();
    }, 2000);

    return () => clearInterval(interval);
  }, [isOpen, exportId, onComplete, status?.status]);

  const getStatusText = () => {
    if (!status) return 'Starting export...';
    
    switch (status.status) {
      case 'pending':
        return 'Preparing export...';
      case 'processing':
        return 'Processing scenes...';
      case 'combining':
        return 'Combining videos...';
      case 'finalizing':
        return 'Finalizing export...';
      case 'completed':
        return 'Export completed!';
      case 'failed':
        return 'Export failed';
      default:
        return 'Processing...';
    }
  };

  const getStatusIcon = () => {
    if (!status) return <Loader2 className="h-6 w-6 animate-spin text-blue-600" />;
    
    switch (status.status) {
      case 'completed':
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      case 'failed':
        return <XCircle className="h-6 w-6 text-red-600" />;
      default:
        return <Loader2 className="h-6 w-6 animate-spin text-blue-600" />;
    }
  };

  const handleDownload = async () => {
    if (!status?.download_url) return;
    
    try {
      const blob = await projectApi.downloadExport(exportId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Create filename with project name and timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const safeProjectName = projectName.replace(/[^a-zA-Z0-9\s\-_]/g, '').replace(/\s+/g, '_');
      a.download = `${safeProjectName}_${timestamp}.mp4`;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to download file');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
          {/* Header */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Export Progress
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
                disabled={status?.status === 'processing' || status?.status === 'combining' || status?.status === 'finalizing'}
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Status */}
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-4">
                {getStatusIcon()}
              </div>
              
              <h4 className="text-lg font-medium text-gray-900 mb-4">
                {getStatusText()}
              </h4>
            </div>

            {/* Progress Bar */}
            {status && status.status !== 'completed' && status.status !== 'failed' && (
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{status.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${status.progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error Message */}
            {(error || status?.error_message) && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-800">
                  {error || status?.error_message}
                </p>
              </div>
            )}

            {/* Completion Info */}
            {status?.status === 'completed' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-green-800">
                  Export completed successfully! Your video is ready to download.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            {status?.status === 'completed' && status.download_url && (
              <button
                onClick={handleDownload}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </button>
            )}
            
            <button
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
            >
              {status?.status === 'completed' || status?.status === 'failed' ? 'Close' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}