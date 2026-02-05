import { useCallback, useEffect, useRef, useState } from 'react';
import type { PRWithDetails, PullRequest } from '../types';
import { generateAISummary } from '../utils/ai';
import {
  createOctokit,
  disableAutoMerge,
  enableAutoMerge,
  fetchCheckRuns,
  fetchPRComments,
  fetchPullRequests,
  mergeBranch,
  triggerCursorFix,
} from '../utils/github';
import { getCachedPRs, getKeepCleanPRs, setCachedPRs, setKeepCleanPRs } from '../utils/storage';

interface UseGitHubOptions {
  token: string | null;
  owner: string;
  repo: string;
  anthropicApiKey: string;
  refreshInterval: number;
}

export const useGitHub = ({
  token,
  owner,
  repo,
  anthropicApiKey,
  refreshInterval,
}: UseGitHubOptions) => {
  // Initialize from cache if available
  const cached = getCachedPRs();
  const [prs, setPRs] = useState<PRWithDetails[]>(cached?.prs ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(
    cached?.timestamp ? new Date(cached.timestamp) : null,
  );
  const keepCleanPRsRef = useRef<Set<number>>(getKeepCleanPRs());

  const fetchData = useCallback(async () => {
    if (!token || !owner || !repo) return;

    setLoading(true);
    setError(null);

    try {
      const octokit = createOctokit(token);
      const pullRequests = await fetchPullRequests(octokit, owner, repo);

      const prsWithDetails: PRWithDetails[] = await Promise.all(
        pullRequests.map(async (pr: PullRequest) => {
          const checks = await fetchCheckRuns(octokit, owner, repo, pr.head.sha);
          return {
            ...pr,
            checks,
            keepClean: keepCleanPRsRef.current.has(pr.number),
          };
        }),
      );

      setPRs(prsWithDetails);
      setCachedPRs(prsWithDetails);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch PRs');
    } finally {
      setLoading(false);
    }
  }, [token, owner, repo]);

  const generateSummary = useCallback(
    async (prNumber: number) => {
      if (!token || !anthropicApiKey) return;

      const octokit = createOctokit(token);
      const pr = prs.find((p) => p.number === prNumber);
      if (!pr) return;

      try {
        const comments = await fetchPRComments(octokit, owner, repo, prNumber);
        const { data: prData } = await octokit.pulls.get({
          owner,
          repo,
          pull_number: prNumber,
        });

        const summary = await generateAISummary(
          anthropicApiKey,
          pr.title,
          prData.body || '',
          comments,
        );

        setPRs((prev) => {
          const updated = prev.map((p) =>
            p.number === prNumber ? { ...p, aiSummary: summary } : p,
          );
          setCachedPRs(updated);
          return updated;
        });
      } catch (err) {
        console.error('Failed to generate summary:', err);
      }
    },
    [token, anthropicApiKey, owner, repo, prs],
  );

  const toggleAutoMerge = useCallback(
    async (prNumber: number, enable: boolean) => {
      if (!token) return;

      const octokit = createOctokit(token);
      try {
        if (enable) {
          await enableAutoMerge(octokit, owner, repo, prNumber);
        } else {
          await disableAutoMerge(octokit, owner, repo, prNumber);
        }
        await fetchData();
      } catch (err) {
        console.error('Failed to toggle auto-merge:', err);
        setError(err instanceof Error ? err.message : 'Failed to toggle auto-merge');
      }
    },
    [token, owner, repo, fetchData],
  );

  const triggerFixCI = useCallback(
    async (prNumber: number) => {
      if (!token) return;

      const octokit = createOctokit(token);
      try {
        await triggerCursorFix(octokit, owner, repo, prNumber, 'fix-ci');
      } catch (err) {
        console.error('Failed to trigger CI fix:', err);
        setError(err instanceof Error ? err.message : 'Failed to trigger CI fix');
      }
    },
    [token, owner, repo],
  );

  const toggleKeepClean = useCallback(
    async (prNumber: number, enable: boolean) => {
      if (!token) return;

      const newKeepClean = new Set(keepCleanPRsRef.current);
      if (enable) {
        newKeepClean.add(prNumber);
        // Trigger immediate keep-clean action
        const octokit = createOctokit(token);
        try {
          await mergeBranch(octokit, owner, repo, prNumber);
        } catch (err) {
          console.error('Failed to merge main:', err);
          // Still trigger cursor bot even if merge fails
          await triggerCursorFix(octokit, owner, repo, prNumber, 'keep-clean');
        }
      } else {
        newKeepClean.delete(prNumber);
      }

      keepCleanPRsRef.current = newKeepClean;
      setKeepCleanPRs(newKeepClean);

      setPRs((prev) => {
        const updated = prev.map((p) =>
          p.number === prNumber ? { ...p, keepClean: enable } : p,
        );
        setCachedPRs(updated);
        return updated;
      });
    },
    [token, owner, repo],
  );

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Periodic refresh
  useEffect(() => {
    if (refreshInterval <= 0) return;

    const interval = setInterval(fetchData, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval]);

  // Check keep-clean PRs periodically
  useEffect(() => {
    if (!token || keepCleanPRsRef.current.size === 0) return;

    const checkKeepClean = async () => {
      const octokit = createOctokit(token);
      
      for (const prNumber of keepCleanPRsRef.current) {
        const pr = prs.find((p) => p.number === prNumber);
        if (!pr) continue;

        // Check if PR needs merge from main
        try {
          const { data: comparison } = await octokit.repos.compareCommits({
            owner,
            repo,
            base: pr.head.ref,
            head: pr.base.ref,
          });

          if (comparison.ahead_by > 0) {
            // Main is ahead, try to merge
            await mergeBranch(octokit, owner, repo, prNumber);
          }
        } catch {
          // Merge might fail, trigger cursor bot
          await triggerCursorFix(octokit, owner, repo, prNumber, 'keep-clean');
        }
      }
    };

    const interval = setInterval(checkKeepClean, 5 * 60 * 1000); // Check every 5 minutes
    return () => clearInterval(interval);
  }, [token, owner, repo, prs]);

  return {
    prs,
    loading,
    error,
    lastUpdated,
    refresh: fetchData,
    generateSummary,
    toggleAutoMerge,
    triggerFixCI,
    toggleKeepClean,
  };
};
