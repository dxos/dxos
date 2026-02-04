import { useCallback, useState } from 'react';
import { AuthForm, Header, PRTable } from './components';
import { useGitHub } from './hooks/useGitHub';
import {
  clearGitHubToken,
  getGitHubToken,
  getSettings,
  setGitHubToken,
  setSettings,
  type StoredSettings,
} from './utils/storage';

export const App = () => {
  const [token, setToken] = useState<string | null>(getGitHubToken());
  const [settings, setSettingsState] = useState<StoredSettings | null>(getSettings());

  const handleAuth = useCallback((newToken: string, newSettings: StoredSettings) => {
    setGitHubToken(newToken);
    setSettings(newSettings);
    setToken(newToken);
    setSettingsState(newSettings);
  }, []);

  const handleSignOut = useCallback(() => {
    clearGitHubToken();
    setToken(null);
  }, []);

  const {
    prs,
    loading,
    error,
    lastUpdated,
    refresh,
    generateSummary,
    toggleAutoMerge,
    triggerFixCI,
    toggleKeepClean,
  } = useGitHub({
    token,
    owner: settings?.owner || '',
    repo: settings?.repo || '',
    anthropicApiKey: settings?.anthropicApiKey || '',
    refreshInterval: settings?.refreshInterval || 30,
  });

  if (!token || !settings) {
    return <AuthForm onSubmit={handleAuth} initialSettings={settings} />;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header owner={settings.owner} repo={settings.repo} onSignOut={handleSignOut} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-900/50 border border-red-700 rounded-lg p-4">
            <p className="text-red-300">{error}</p>
          </div>
        )}
        
        <PRTable
          prs={prs}
          loading={loading}
          lastUpdated={lastUpdated}
          onRefresh={refresh}
          onToggleAutoMerge={toggleAutoMerge}
          onTriggerFixCI={triggerFixCI}
          onToggleKeepClean={toggleKeepClean}
          onGenerateSummary={generateSummary}
        />
      </main>
    </div>
  );
};
