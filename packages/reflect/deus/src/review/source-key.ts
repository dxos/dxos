//
// Copyright 2026 DXOS.org
//

/** The prefix of a key written in text: `github:owner/repo/path`. */
export const GITHUB_SOURCE = 'github';

/**
 * A location in a GitHub repository: `github:owner/repo/path/to/file[#fragment]`.
 * The fragment names a spec block (`#F-1`, `#Scene`) or a code symbol (`#MyClass`).
 */
export type SourceKey = {
  owner: string;
  repo: string;
  /** POSIX path relative to the repository root. */
  path: string;
  fragment?: string;
};

/** Matches a key in running text; a trailing `.` is sentence punctuation and is trimmed by {@link findSourceKeys}. */
export const SOURCE_KEY_PATTERN = /github:[\w.-]+\/[\w.-]+\/[\w./@+-]+(?:#[\w$.-]+)?/g;

/** Parses `github:owner/repo/path[#fragment]`; undefined when the text is not a key. */
export const parseSourceKey = (text: string): SourceKey | undefined => {
  const match = text.trim().match(/^github:([\w.-]+)\/([\w.-]+)\/([^#\s]+)(?:#([\w$.-]+))?$/);
  if (!match) {
    return undefined;
  }
  const [, owner, repo, path, fragment] = match;
  return { owner, repo, path, ...(fragment && { fragment }) };
};

/** Formats a key; the fragment is included only when asked for. */
export const formatSourceKey = ({ owner, repo, path, fragment }: SourceKey, withFragment = true): string =>
  `${GITHUB_SOURCE}:${owner}/${repo}/${path}${withFragment && fragment ? `#${fragment}` : ''}`;

/** `owner/repo`, the identity a local checkout is matched by. */
export const repoId = ({ owner, repo }: Pick<SourceKey, 'owner' | 'repo'>): string => `${owner}/${repo}`;

/** `owner/repo` from a GitHub remote URL (`git@github.com:o/r.git`, `https://github.com/o/r`). */
export const parseGitHubRemote = (url: string): string | undefined =>
  url
    .match(/github\.com[:/]([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/)
    ?.slice(1, 3)
    .join('/');

/** Whether the key points at a spec document rather than at code. */
export const isSpecKey = (key: SourceKey): boolean => key.path.endsWith('.mdl');

/** The review written beside a spec: `SPEC.mdl` -> `SPEC.review.mdl`. */
export const reviewKeyOf = (key: SourceKey): SourceKey => ({
  owner: key.owner,
  repo: key.repo,
  path: key.path.replace(/\.mdl$/, '.review.mdl'),
});

/** Every key mentioned in a text, with its offsets. */
export const findSourceKeys = (text: string): { from: number; to: number; key: SourceKey; raw: string }[] =>
  [...text.matchAll(SOURCE_KEY_PATTERN)].flatMap((match) => {
    const raw = match[0].replace(/\.+$/, '');
    const key = parseSourceKey(raw);
    return key ? [{ from: match.index, to: match.index + raw.length, key, raw }] : [];
  });
