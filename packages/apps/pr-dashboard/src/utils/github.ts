import { Octokit } from '@octokit/rest';
import type { CheckRun, PRWithDetails, PullRequest } from '../types';

export const createOctokit = (token: string) => {
  return new Octokit({ auth: token });
};

export const fetchPullRequests = async (
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<PullRequest[]> => {
  const { data } = await octokit.pulls.list({
    owner,
    repo,
    state: 'open',
    sort: 'updated',
    direction: 'desc',
    per_page: 100,
  });

  // Fetch detailed info for each PR to get additions/deletions
  const detailedPRs = await Promise.all(
    data.map(async (pr) => {
      const { data: detailed } = await octokit.pulls.get({
        owner,
        repo,
        pull_number: pr.number,
      });
      return detailed as PullRequest;
    }),
  );

  return detailedPRs;
};

export const fetchCheckRuns = async (
  octokit: Octokit,
  owner: string,
  repo: string,
  ref: string,
): Promise<CheckRun[]> => {
  const { data } = await octokit.checks.listForRef({
    owner,
    repo,
    ref,
    per_page: 100,
  });

  return data.check_runs.map((run) => ({
    id: run.id,
    name: run.name,
    status: run.status as CheckRun['status'],
    conclusion: run.conclusion as CheckRun['conclusion'],
    html_url: run.html_url || '',
  }));
};

export const fetchPRWithDetails = async (
  octokit: Octokit,
  owner: string,
  repo: string,
  pr: PullRequest,
): Promise<PRWithDetails> => {
  const checks = await fetchCheckRuns(octokit, owner, repo, pr.head.sha);
  return { ...pr, checks };
};

export const enableAutoMerge = async (
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number,
): Promise<void> => {
  // GraphQL mutation to enable auto-merge
  await octokit.graphql(`
    mutation EnableAutoMerge($pullRequestId: ID!) {
      enablePullRequestAutoMerge(input: {
        pullRequestId: $pullRequestId
        mergeMethod: SQUASH
      }) {
        pullRequest {
          autoMergeRequest {
            enabledAt
          }
        }
      }
    }
  `, {
    pullRequestId: await getPRNodeId(octokit, owner, repo, pullNumber),
  });
};

export const disableAutoMerge = async (
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number,
): Promise<void> => {
  await octokit.graphql(`
    mutation DisableAutoMerge($pullRequestId: ID!) {
      disablePullRequestAutoMerge(input: {
        pullRequestId: $pullRequestId
      }) {
        pullRequest {
          autoMergeRequest {
            enabledAt
          }
        }
      }
    }
  `, {
    pullRequestId: await getPRNodeId(octokit, owner, repo, pullNumber),
  });
};

const getPRNodeId = async (
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number,
): Promise<string> => {
  const { data } = await octokit.pulls.get({
    owner,
    repo,
    pull_number: pullNumber,
  });
  return data.node_id;
};

export const mergeBranch = async (
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number,
  baseBranch: string = 'main',
): Promise<void> => {
  const { data: pr } = await octokit.pulls.get({
    owner,
    repo,
    pull_number: pullNumber,
  });

  await octokit.repos.merge({
    owner,
    repo,
    base: pr.head.ref,
    head: baseBranch,
  });
};

export const triggerCursorFix = async (
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number,
  action: 'fix-ci' | 'keep-clean',
): Promise<void> => {
  const body = action === 'fix-ci' 
    ? '@cursor-bot please fix the CI failures'
    : '@cursor-bot please merge main and fix any minor issues';
    
  await octokit.issues.createComment({
    owner,
    repo,
    issue_number: pullNumber,
    body,
  });
};

export const fetchPRComments = async (
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number,
): Promise<string[]> => {
  const { data: comments } = await octokit.issues.listComments({
    owner,
    repo,
    issue_number: pullNumber,
    per_page: 100,
  });
  
  const { data: reviewComments } = await octokit.pulls.listReviewComments({
    owner,
    repo,
    pull_number: pullNumber,
    per_page: 100,
  });

  return [
    ...comments.map(c => c.body || ''),
    ...reviewComments.map(c => c.body || ''),
  ].filter(Boolean);
};
