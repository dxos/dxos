//
// Copyright 2026 DXOS.org
//

// The shapes a GitHub reference takes, and nothing else: the operations that read one run in node
// and workerd, where importing the editor's link widget would drag React into the plugin's entry
// (`plugin-github:check-module-structure` fails on exactly that).

/**
 * `https://github.com/owner/repo`, `/pull/123` or `/issues/123`, with an optional trailing slash,
 * fragment or query. A path below the repository (`/blob/…`, `/actions`) is a page, not an object.
 */
export const GITHUB_LINK =
  /^https:\/\/github\.com\/([^/\s?#]+)\/([^/\s?#]+)(?:\/(pull|issues)\/(\d+)(?:[/?#]\S*)?|\/?(?:[?#]\S*)?)$/;

export type GitHubLink = {
  owner: string;
  repo: string;
  kind: 'repo' | 'pull' | 'issue';
  /** Absent for a repository. */
  number?: number;
  url: string;
};

/** The parts of a pull request or issue URL, or undefined for any other URL. */
export const parseGitHubLink = (url: string): GitHubLink | undefined => {
  const match = GITHUB_LINK.exec(url);
  if (!match) {
    return undefined;
  }
  const [, owner, repo, kind, number] = match;
  if (!kind) {
    return { owner, repo, kind: 'repo', url };
  }
  return { owner, repo, kind: kind === 'pull' ? 'pull' : 'issue', number: Number(number), url };
};

/**
 * `owner/repo#123` — how a pull request is written where a URL would be noise, and the one form a
 * reviewer can type from memory.
 */
const PULL_REQUEST_SHORTHAND = /^([\w.-]+)\/([\w.-]+)#(\d+)$/;

/** A pull request named by its coordinates, however the user wrote it. */
export type PullRequestReference = {
  owner: string;
  repo: string;
  number: number;
};

/**
 * The pull request a user's text names: a github.com URL or `owner/repo#123`.
 *
 * An `/issues/123` URL is accepted alongside `/pull/123` because GitHub itself serves a pull
 * request under both, and a reader who copied the wrong one still means the same change.
 */
export const parsePullRequestReference = (value: string): PullRequestReference | undefined => {
  const text = value.trim();
  const shorthand = PULL_REQUEST_SHORTHAND.exec(text);
  if (shorthand) {
    const [, owner, repo, number] = shorthand;
    return { owner, repo, number: Number(number) };
  }

  const link = parseGitHubLink(text);
  if (!link || link.number === undefined) {
    return undefined;
  }
  return { owner: link.owner, repo: link.repo, number: link.number };
};
