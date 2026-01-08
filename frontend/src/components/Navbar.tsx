import { Link, useLocation } from 'react-router-dom';

interface NavbarProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export function Navbar({ darkMode, toggleDarkMode }: NavbarProps) {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark px-6 py-4 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <div className="bg-primary/10 p-2 rounded-full">
          <span className="material-icons-outlined text-primary text-2xl">sync_alt</span>
        </div>
        <div>
          <h1 className="font-bold text-xl tracking-wide uppercase text-text-light dark:text-white">
            SmartPLM Soluções em Engenharia
          </h1>
          <p className="text-xs text-text-muted-light dark:text-text-muted-dark">
            ETL de Windchill para Teamcenter
          </p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="hidden md:flex gap-4 text-sm font-medium">
          <Link
            to="/"
            className={`pb-1 transition-colors ${
              isActive('/')
                ? 'text-primary border-b-2 border-primary'
                : 'text-text-muted-light dark:text-text-muted-dark hover:text-primary dark:hover:text-white'
            }`}
          >
            Painel
          </Link>
          <Link
            to="/logs"
            className={`pb-1 transition-colors ${
              isActive('/logs')
                ? 'text-primary border-b-2 border-primary'
                : 'text-text-muted-light dark:text-text-muted-dark hover:text-primary dark:hover:text-white'
            }`}
          >
            Logs
          </Link>
          <Link
            to="/configuracoes"
            className={`pb-1 transition-colors ${
              isActive('/configuracoes')
                ? 'text-primary border-b-2 border-primary'
                : 'text-text-muted-light dark:text-text-muted-dark hover:text-primary dark:hover:text-white'
            }`}
          >
            Configurações
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/configuracoes"
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Configurações"
          >
            <span className="material-icons-outlined text-text-muted-light dark:text-text-muted-dark">settings</span>
          </Link>
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title={darkMode ? 'Modo Claro' : 'Modo Escuro'}
          >
            <span className="material-icons-outlined text-text-muted-light dark:text-text-muted-dark">
              {darkMode ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 overflow-hidden border-2 border-white dark:border-gray-500 flex items-center justify-center">
            <span className="material-icons-outlined text-gray-500 dark:text-gray-300">person</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
