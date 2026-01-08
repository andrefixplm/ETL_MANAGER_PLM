import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getConfiguracoes, atualizarConfiguracao } from '../services/api';

export function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states
  const [vaultRaiz, setVaultRaiz] = useState('');
  const [destinoPadrao, setDestinoPadrao] = useState('');
  const [usarPadding, setUsarPadding] = useState(true);
  const [adicionarFv, setAdicionarFv] = useState(false);

  useEffect(() => {
    fetchConfiguracoes();
  }, []);

  const fetchConfiguracoes = async () => {
    try {
      const response = await getConfiguracoes();
      setVaultRaiz(response.data.vault_raiz || '');
      setDestinoPadrao(response.data.destino_padrao || '');
      setUsarPadding(response.data.usar_padding_hex);
      setAdicionarFv(response.data.adicionar_extensao_fv);
    } catch (error) {
      console.error('Error fetching config:', error);
      setMessage({ type: 'error', text: 'Erro ao carregar configurações' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      await Promise.all([
        atualizarConfiguracao('vault_raiz', vaultRaiz),
        atualizarConfiguracao('destino_padrao', destinoPadrao),
        atualizarConfiguracao('usar_padding_hex', usarPadding ? 'true' : 'false'),
        atualizarConfiguracao('adicionar_extensao_fv', adicionarFv ? 'true' : 'false'),
      ]);

      setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
      fetchConfiguracoes();
    } catch (error) {
      console.error('Error saving config:', error);
      setMessage({ type: 'error', text: 'Erro ao salvar configurações' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <span className="material-icons-outlined animate-spin text-4xl text-primary">refresh</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      {/* Breadcrumbs */}
      <nav className="flex flex-wrap gap-2 mb-6 items-center">
        <Link to="/" className="text-text-muted-light dark:text-text-muted-dark text-sm font-medium hover:text-primary transition-colors">
          Início
        </Link>
        <span className="material-icons-outlined text-text-muted-light dark:text-text-muted-dark text-base">
          chevron_right
        </span>
        <span className="text-text-light dark:text-white text-sm font-medium">Configurações</span>
      </nav>

      {/* Page Heading */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="material-icons-outlined text-3xl text-primary">settings</span>
          <h1 className="text-3xl font-black text-text-light dark:text-white">Configurações</h1>
        </div>
        <p className="text-text-muted-light dark:text-text-muted-dark text-sm max-w-2xl">
          Configure os caminhos do vault Windchill e opções de restauração de arquivos.
        </p>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success'
            ? 'bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800'
            : 'bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800'
        }`}>
          <span className={`material-icons-outlined ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {message.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <p className={`text-sm font-medium ${
            message.type === 'success' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
          }`}>
            {message.text}
          </p>
        </div>
      )}

      {/* Vault Configuration */}
      <div className="overflow-hidden rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark shadow-sm mb-6">
        <div className="border-b border-border-light dark:border-border-dark px-6 py-4 bg-background-light dark:bg-background-dark">
          <div className="flex items-center gap-2">
            <span className="material-icons-outlined text-primary">folder_open</span>
            <h3 className="text-base font-semibold text-text-light dark:text-white">Configuração do Vault</h3>
          </div>
          <p className="mt-1 text-sm text-text-muted-light dark:text-text-muted-dark">
            Defina o caminho raiz da pasta de vaults do Windchill.
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Vault Root Path */}
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-white mb-2">
              Caminho Raiz do Vault
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span className="material-icons-outlined text-gray-400 text-xl">folder</span>
              </div>
              <input
                type="text"
                value={vaultRaiz}
                onChange={(e) => setVaultRaiz(e.target.value)}
                placeholder="E:\PTC\Windchill\vaults\defaultcachevault"
                className="block w-full rounded-lg border-0 py-3 pl-10 pr-4 text-text-light dark:text-white ring-1 ring-inset ring-border-light dark:ring-border-dark placeholder:text-gray-400 focus:ring-2 focus:ring-primary bg-background-light dark:bg-background-dark text-sm font-mono"
              />
            </div>
            <p className="mt-2 text-xs text-text-muted-light dark:text-text-muted-dark">
              Este caminho será usado quando o arquivo importado não tiver um caminho de vault específico.
            </p>
          </div>

          {/* Default Destination Path */}
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-white mb-2">
              Pasta de Destino Padrão
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span className="material-icons-outlined text-gray-400 text-xl">save_alt</span>
              </div>
              <input
                type="text"
                value={destinoPadrao}
                onChange={(e) => setDestinoPadrao(e.target.value)}
                placeholder="C:\Export\SmartPLM\Restored"
                className="block w-full rounded-lg border-0 py-3 pl-10 pr-4 text-text-light dark:text-white ring-1 ring-inset ring-border-light dark:ring-border-dark placeholder:text-gray-400 focus:ring-2 focus:ring-primary bg-background-light dark:bg-background-dark text-sm font-mono"
              />
            </div>
            <p className="mt-2 text-xs text-text-muted-light dark:text-text-muted-dark">
              Pasta padrão para onde os arquivos restaurados serão copiados.
            </p>
          </div>
        </div>
      </div>

      {/* Advanced Options */}
      <div className="overflow-hidden rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark shadow-sm mb-6">
        <div className="border-b border-border-light dark:border-border-dark px-6 py-4 bg-background-light dark:bg-background-dark">
          <div className="flex items-center gap-2">
            <span className="material-icons-outlined text-primary">tune</span>
            <h3 className="text-base font-semibold text-text-light dark:text-white">Opções Avançadas</h3>
          </div>
          <p className="mt-1 text-sm text-text-muted-light dark:text-text-muted-dark">
            Configurações de formatação do nome dos arquivos no vault.
          </p>
        </div>

        <div className="p-6 space-y-4">
          {/* Use Padding Hex */}
          <label className="flex items-start gap-4 cursor-pointer group">
            <div className="relative flex items-center">
              <input
                type="checkbox"
                checked={usarPadding}
                onChange={(e) => setUsarPadding(e.target.checked)}
                className="peer sr-only"
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </div>
            <div className="flex-1">
              <span className="text-sm font-medium text-text-light dark:text-white group-hover:text-primary transition-colors">
                Usar Zero-Padding no Nome Hex
              </span>
              <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-1">
                Adiciona zeros à esquerda para completar 14 dígitos. Ex: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">B0BB4C</code> → <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">00000000B0BB4C</code>
              </p>
            </div>
          </label>

          {/* Add .fv Extension */}
          <label className="flex items-start gap-4 cursor-pointer group">
            <div className="relative flex items-center">
              <input
                type="checkbox"
                checked={adicionarFv}
                onChange={(e) => setAdicionarFv(e.target.checked)}
                className="peer sr-only"
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </div>
            <div className="flex-1">
              <span className="text-sm font-medium text-text-light dark:text-white group-hover:text-primary transition-colors">
                Adicionar Extensão .fv
              </span>
              <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-1">
                Adiciona a extensão <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">.fv</code> ao buscar arquivos no vault.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-4">
        <Link
          to="/"
          className="px-6 py-3 rounded-lg border border-border-light dark:border-border-dark text-text-muted-light dark:text-text-muted-dark hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm font-semibold"
        >
          Cancelar
        </Link>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <span className="material-icons-outlined animate-spin text-lg">refresh</span>
              Salvando...
            </>
          ) : (
            <>
              <span className="material-icons-outlined text-lg">save</span>
              Salvar Configurações
            </>
          )}
        </button>
      </div>
    </div>
  );
}
