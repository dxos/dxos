import {
  ArrowsClockwise,
  GitMerge,
  Lightning,
  MagicWand,
  Sparkle,
} from '@phosphor-icons/react';
import { useState } from 'react';
import type { PRWithDetails } from '../types';
import { ChecksStatus } from './ChecksStatus';

interface PRRowProps {
  pr: PRWithDetails;
  onToggleAutoMerge: (prNumber: number, enable: boolean) => void;
  onTriggerFixCI: (prNumber: number) => void;
  onToggleKeepClean: (prNumber: number, enable: boolean) => void;
  onGenerateSummary: (prNumber: number) => void;
}

export const PRRow = ({
  pr,
  onToggleAutoMerge,
  onTriggerFixCI,
  onToggleKeepClean,
  onGenerateSummary,
}: PRRowProps) => {
  const [loadingAutoMerge, setLoadingAutoMerge] = useState(false);
  const [loadingFixCI, setLoadingFixCI] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const hasFailedChecks = pr.checks.some(
    (c) => c.status === 'completed' && c.conclusion === 'failure',
  );

  const handleAutoMerge = async () => {
    setLoadingAutoMerge(true);
    try {
      await onToggleAutoMerge(pr.number, !pr.auto_merge);
    } finally {
      setLoadingAutoMerge(false);
    }
  };

  const handleFixCI = async () => {
    setLoadingFixCI(true);
    try {
      await onTriggerFixCI(pr.number);
    } finally {
      setLoadingFixCI(false);
    }
  };

  const handleGenerateSummary = async () => {
    setLoadingSummary(true);
    try {
      await onGenerateSummary(pr.number);
    } finally {
      setLoadingSummary(false);
    }
  };

  return (
    <tr className="border-b border-gray-700 hover:bg-gray-800/50 transition-colors">
      {/* Author */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <img
            src={pr.user.avatar_url}
            alt={pr.user.login}
            className="w-8 h-8 rounded-full"
          />
          <span className="text-sm text-gray-300 hidden md:inline">{pr.user.login}</span>
        </div>
      </td>

      {/* PR ID */}
      <td className="px-4 py-3">
        <a
          href={pr.html_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 font-mono text-sm"
        >
          #{pr.number}
        </a>
      </td>

      {/* PR Name */}
      <td className="px-4 py-3 max-w-xs lg:max-w-md">
        <a
          href={pr.html_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-100 hover:text-white font-medium truncate block"
          title={pr.title}
        >
          {pr.draft && (
            <span className="inline-block bg-gray-600 text-gray-300 text-xs px-1.5 py-0.5 rounded mr-2">
              Draft
            </span>
          )}
          {pr.title}
        </a>
      </td>

      {/* Changes */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-green-400">+{pr.additions}</span>
          <span className="text-red-400">-{pr.deletions}</span>
          <span className="text-gray-500">({pr.changed_files} files)</span>
        </div>
      </td>

      {/* CI Checks */}
      <td className="px-4 py-3">
        <ChecksStatus checks={pr.checks} />
      </td>

      {/* AI Summary */}
      <td className="px-4 py-3 max-w-[200px]">
        {pr.aiSummary ? (
          <p className="text-sm text-gray-300 italic whitespace-pre-line">{pr.aiSummary}</p>
        ) : (
          <button
            onClick={handleGenerateSummary}
            disabled={loadingSummary}
            className="btn btn-secondary text-xs flex items-center gap-1"
          >
            {loadingSummary ? (
              <ArrowsClockwise className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkle className="w-4 h-4" />
            )}
            Haiku
          </button>
        )}
      </td>

      {/* Fix CI Button */}
      <td className="px-4 py-3">
        <button
          onClick={handleFixCI}
          disabled={loadingFixCI || !hasFailedChecks}
          className={`btn text-xs flex items-center gap-1 ${
            hasFailedChecks ? 'btn-danger' : 'btn-secondary opacity-50 cursor-not-allowed'
          }`}
          title={hasFailedChecks ? 'Ask Cursor to fix CI' : 'No failed checks'}
        >
          {loadingFixCI ? (
            <ArrowsClockwise className="w-4 h-4 animate-spin" />
          ) : (
            <Lightning className="w-4 h-4" />
          )}
          Fix CI
        </button>
      </td>

      {/* Automerge Toggle */}
      <td className="px-4 py-3">
        <button
          onClick={handleAutoMerge}
          disabled={loadingAutoMerge}
          className={`btn text-xs flex items-center gap-1 ${
            pr.auto_merge ? 'btn-success' : 'btn-secondary'
          }`}
        >
          {loadingAutoMerge ? (
            <ArrowsClockwise className="w-4 h-4 animate-spin" />
          ) : (
            <GitMerge className="w-4 h-4" />
          )}
          {pr.auto_merge ? 'Auto' : 'Manual'}
        </button>
      </td>

      {/* Keep Clean */}
      <td className="px-4 py-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={pr.keepClean || false}
            onChange={(e) => onToggleKeepClean(pr.number, e.target.checked)}
            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-800"
          />
          <MagicWand className="w-4 h-4 text-gray-400" />
        </label>
      </td>
    </tr>
  );
};
