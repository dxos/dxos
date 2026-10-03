//
// Copyright 2026 DXOS.org
//

/** Owner, repository and number, as a pull request URL names them. */
export type PullRequestRef = {
  owner: string;
  repo: string;
  number: number;
};

// `[^/?#]`, and a word boundary after the number: an unanchored tail would read a query string as
// part of the repository name and `…/pull/12x` as pull request 12, while a fixed delimiter set
// would reject the trailing period or bracket a URL copied out of prose carries.
const PULL_URL = /^https?:\/\/(?:www\.)?github\.com\/([^/?#]+)\/([^/?#]+)\/pull\/(\d+)(?![\w-])/i;

/** Reads `https://github.com/owner/repo/pull/123`, with or without a trailing path. */
export const parsePullRequestUrl = (url: string): PullRequestRef | undefined => {
  const match = PULL_URL.exec(url.trim());
  if (!match) {
    return undefined;
  }

  return { owner: match[1], repo: match[2], number: Number(match[3]) };
};

export type RemotePullRequest = {
  title: string;
  body?: string;
  baseBranch?: string;
  headBranch?: string;
  commit?: string;
  diff: string;
};

const API = 'https://api.github.com';

/**
 * Fetches a public pull request and its diff straight from the browser. `api.github.com` answers
 * cross-origin and does not require a token for a public repository, so a story needs no credentials
 * — at the cost of the unauthenticated rate limit, which is per IP and easy to hit.
 */
export const fetchPullRequest = async ({ owner, repo, number }: PullRequestRef): Promise<RemotePullRequest> => {
  const url = `${API}/repos/${owner}/${repo}/pulls/${number}`;
  const [meta, diff] = await Promise.all([
    fetch(url, { headers: { Accept: 'application/vnd.github+json' } }),
    fetch(url, { headers: { Accept: 'application/vnd.github.v3.diff' } }),
  ]);
  if (!meta.ok) {
    throw new Error(`GitHub answered ${meta.status} for ${owner}/${repo}#${number}.`);
  }
  if (!diff.ok) {
    // 406 is how GitHub reports a pull request too large to serve as one diff.
    throw new Error(
      diff.status === 406
        ? `${owner}/${repo}#${number} is too large for GitHub to serve as a single diff.`
        : `GitHub answered ${diff.status} for the diff of ${owner}/${repo}#${number}.`,
    );
  }

  const json = await meta.json();
  return {
    title: json.title,
    body: json.body ?? undefined,
    baseBranch: json.base?.ref,
    headBranch: json.head?.ref,
    commit: json.head?.sha,
    diff: await diff.text(),
  };
};
