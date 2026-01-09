import { useState, useRef, useEffect, useCallback } from 'react';
import { importFile, getImportStatus, type ImportJobStatus } from '../services/api';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Threshold for suggesting async mode (5MB)
const LARGE_FILE_THRESHOLD = 5 * 1024 * 1024;

export function ImportModal({ isOpen, onClose, onSuccess }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [asyncMode, setAsyncMode] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<ImportJobStatus | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<number | null>(null);

  // Poll for job status when in async mode
  const pollJobStatus = useCallback(async (id: string) => {
    try {
      const response = await getImportStatus(id);
      setJobStatus(response.data);

      if (response.data.status === 'completed') {
        setResult(`Importacao concluida! ${response.data.inserted} registros importados.`);
        setLoading(false);
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      } else if (response.data.status === 'error') {
        setError(response.data.error || 'Erro durante a importacao');
        setLoading(false);
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      }
    } catch (err) {
      console.error('Erro ao verificar status:', err);
    }
  }, [onSuccess, onClose]);

  // Start polling when jobId changes
  useEffect(() => {
    if (jobId) {
      // Initial poll
      pollJobStatus(jobId);

      // Set up polling interval
      pollingRef.current = window.setInterval(() => {
        pollJobStatus(jobId);
      }, 1000);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [jobId, pollJobStatus]);

  // Cleanup on close
  useEffect(() => {
    if (!isOpen && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setResult(null);
      setJobId(null);
      setJobStatus(null);

      // Auto-enable async mode for large files
      if (selectedFile.size > LARGE_FILE_THRESHOLD) {
        setAsyncMode(true);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setError(null);
      setResult(null);
      setJobId(null);
      setJobStatus(null);

      if (droppedFile.size > LARGE_FILE_THRESHOLD) {
        setAsyncMode(true);
      }
    }
  };

  const handleSubmit = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setJobStatus(null);

    try {
      const response = await importFile(file, asyncMode);

      if (asyncMode && response.data.job_id) {
        setJobId(response.data.job_id);
        // Polling will be handled by useEffect
      } else {
        setResult(`Importacao concluida! ${response.data.registros_importados} registros importados.`);
        setLoading(false);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao importar arquivo');
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setFile(null);
    setError(null);
    setResult(null);
    setAsyncMode(false);
    setJobId(null);
    setJobStatus(null);
    onClose();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isLargeFile = file && file.size > LARGE_FILE_THRESHOLD;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-text-light dark:text-white">Importar Arquivo</h3>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <span className="material-icons-outlined text-text-muted-light dark:text-text-muted-dark">
              close
            </span>
          </button>
        </div>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => !loading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            loading
              ? 'border-gray-300 dark:border-gray-600 cursor-not-allowed'
              : 'border-border-light dark:border-border-dark cursor-pointer hover:border-primary'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json,.md"
            onChange={handleFileChange}
            className="hidden"
            disabled={loading}
          />
          <span className="material-icons-outlined text-4xl text-text-muted-light dark:text-text-muted-dark mb-2">
            cloud_upload
          </span>
          <p className="text-text-muted-light dark:text-text-muted-dark text-sm">
            {file ? file.name : 'Arraste um arquivo ou clique para selecionar'}
          </p>
          {file && (
            <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-1">
              Tamanho: {formatFileSize(file.size)}
            </p>
          )}
          <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-1">
            Formatos: CSV, JSON, MD
          </p>
        </div>

        {/* Async mode option */}
        {file && (
          <div className="mt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={asyncMode}
                onChange={(e) => setAsyncMode(e.target.checked)}
                disabled={loading}
                className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
              />
              <span className="text-sm text-text-muted-light dark:text-text-muted-dark">
                Processar em lotes (recomendado para arquivos grandes)
              </span>
            </label>
            {isLargeFile && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1 ml-6">
                Arquivo grande detectado - modo em lotes ativado automaticamente
              </p>
            )}
          </div>
        )}

        {/* Progress indicator for async mode */}
        {loading && jobStatus && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                {jobStatus.status === 'queued' && 'Aguardando...'}
                {jobStatus.status === 'processing' && 'Processando...'}
              </span>
              <span className="text-sm text-blue-600 dark:text-blue-300">
                {jobStatus.progress.toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
              <div
                className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
                style={{ width: `${jobStatus.progress}%` }}
              />
            </div>
            <div className="mt-2 text-xs text-blue-600 dark:text-blue-300">
              {jobStatus.processed} de {jobStatus.total} registros processados
              {jobStatus.inserted > 0 && ` (${jobStatus.inserted} inseridos)`}
            </div>
          </div>
        )}

        {/* Simple loading indicator for sync mode */}
        {loading && !jobStatus && !asyncMode && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="material-icons-outlined animate-spin text-blue-600">refresh</span>
              <span className="text-sm text-blue-700 dark:text-blue-400">
                Processando arquivo...
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {result && (
          <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-green-700 dark:text-green-400 text-sm">{result}</p>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2.5 border border-border-light dark:border-border-dark rounded-full text-text-muted-light dark:text-text-muted-dark hover:border-primary hover:text-primary transition-colors font-medium"
          >
            {loading ? 'Fechar' : 'Cancelar'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!file || loading}
            className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-full font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="material-icons-outlined animate-spin text-lg">refresh</span>
                Importando...
              </>
            ) : (
              <>
                <span className="material-icons-outlined text-lg">upload</span>
                Importar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
