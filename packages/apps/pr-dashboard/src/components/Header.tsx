import { GithubLogo, SignOut } from '@phosphor-icons/react';

interface HeaderProps {
  owner: string;
  repo: string;
  onSignOut: () => void;
}

export const Header = ({ owner, repo, onSignOut }: HeaderProps) => {
  return (
    <header className="bg-gray-800 border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <GithubLogo className="w-8 h-8 text-white" weight="fill" />
              <h1 className="text-xl font-bold text-white">PR Dashboard</h1>
            </div>
            <div className="hidden sm:block">
              <span className="text-gray-400 text-sm">
                {owner}/{repo}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onSignOut}
              className="btn btn-secondary flex items-center gap-2"
            >
              <SignOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
