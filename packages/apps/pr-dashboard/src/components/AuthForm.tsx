import { useState } from 'react';
import type { StoredSettings } from '../utils/storage';

interface AuthFormProps {
  onSubmit: (token: string, settings: StoredSettings) => void;
  initialSettings?: StoredSettings | null;
}

export const AuthForm = ({ onSubmit, initialSettings }: AuthFormProps) => {
  const [token, setToken] = useState('');
  const [owner, setOwner] = useState(initialSettings?.owner || 'dxos');
  const [repo, setRepo] = useState(initialSettings?.repo || 'dxos');
  const [anthropicApiKey, setAnthropicApiKey] = useState(initialSettings?.anthropicApiKey || '');
  const [refreshInterval, setRefreshInterval] = useState(initialSettings?.refreshInterval || 30);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(token, { owner, repo, anthropicApiKey, refreshInterval });
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">PR Dashboard</h1>
          <p className="text-gray-400">Configure your GitHub and AI settings</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="token" className="block text-sm font-medium text-gray-300 mb-2">
              GitHub Personal Access Token
            </label>
            <input
              type="password"
              id="token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxx"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Requires repo, write:discussion scopes
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="owner" className="block text-sm font-medium text-gray-300 mb-2">
                Owner
              </label>
              <input
                type="text"
                id="owner"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="dxos"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label htmlFor="repo" className="block text-sm font-medium text-gray-300 mb-2">
                Repository
              </label>
              <input
                type="text"
                id="repo"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="dxos"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="anthropicKey" className="block text-sm font-medium text-gray-300 mb-2">
              Anthropic API Key (optional)
            </label>
            <input
              type="password"
              id="anthropicKey"
              value={anthropicApiKey}
              onChange={(e) => setAnthropicApiKey(e.target.value)}
              placeholder="sk-ant-xxxxxxxxxxxx"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">
              For AI haiku summaries of PRs
            </p>
          </div>

          <div>
            <label htmlFor="refreshInterval" className="block text-sm font-medium text-gray-300 mb-2">
              Refresh Interval (seconds)
            </label>
            <input
              type="number"
              id="refreshInterval"
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              min={10}
              max={300}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            className="w-full btn btn-primary py-3 text-lg"
          >
            Connect
          </button>
        </form>
      </div>
    </div>
  );
};
