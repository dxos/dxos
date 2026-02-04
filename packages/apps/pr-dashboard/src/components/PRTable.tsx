import { ArrowsClockwise, Info } from '@phosphor-icons/react';
import type { PRWithDetails } from '../types';
import { PRRow } from './PRRow';

interface PRTableProps {
  prs: PRWithDetails[];
  loading: boolean;
  lastUpdated: Date | null;
  onRefresh: () => void;
  onToggleAutoMerge: (prNumber: number, enable: boolean) => void;
  onTriggerFixCI: (prNumber: number) => void;
  onToggleKeepClean: (prNumber: number, enable: boolean) => void;
  onGenerateSummary: (prNumber: number) => void;
}

export const PRTable = ({
  prs,
  loading,
  lastUpdated,
  onRefresh,
  onToggleAutoMerge,
  onTriggerFixCI,
  onToggleKeepClean,
  onGenerateSummary,
}: PRTableProps) => {
  return (
    <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Open Pull Requests</h2>
          {lastUpdated && (
            <p className="text-xs text-gray-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="btn btn-secondary flex items-center gap-2"
        >
          <ArrowsClockwise className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-900/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Author
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                PR
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Title
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Changes
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                CI
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Summary
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Fix CI
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Merge
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                <div className="flex items-center gap-1 group relative">
                  Clean
                  <Info className="w-3 h-3 text-gray-500 cursor-help" />
                  <div className="absolute z-10 hidden group-hover:block bg-gray-800 border border-gray-700 rounded-md p-2 min-w-[200px] top-full left-0 mt-1">
                    <p className="text-xs text-gray-300 normal-case font-normal">
                      Keep branch up-to-date with main and automatically fix minor issues via Cursor
                    </p>
                  </div>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {prs.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <ArrowsClockwise className="w-5 h-5 animate-spin" />
                      Loading pull requests...
                    </div>
                  ) : (
                    'No open pull requests found'
                  )}
                </td>
              </tr>
            ) : (
              prs.map((pr) => (
                <PRRow
                  key={pr.id}
                  pr={pr}
                  onToggleAutoMerge={onToggleAutoMerge}
                  onTriggerFixCI={onTriggerFixCI}
                  onToggleKeepClean={onToggleKeepClean}
                  onGenerateSummary={onGenerateSummary}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-3 border-t border-gray-700 text-sm text-gray-500">
        {prs.length} open PR{prs.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
};
