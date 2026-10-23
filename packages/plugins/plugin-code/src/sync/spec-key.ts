//
// Copyright 2026 DXOS.org
//

/** The prefix of a key written in text: `github:owner/repo/path`. */
export const GITHUB_SOURCE = 'github';

/** A key as stored in an object's meta keys; plugin-projects already writes `github.com/dxos/dxos` + repo path. */
export type MetaKey = { source: string; id: string };

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

/** The meta key a synced object carries: the repository as `source`, the file path as `id`. */
export const toMetaKey = (key: SourceKey): MetaKey => ({ source: `github.com/${repoId(key)}`, id: key.path });

/** Inverse of {@link toMetaKey}; undefined for keys from other sources. */
export const fromMetaKey = ({ source, id }: MetaKey): SourceKey | undefined => {
  const match = source.match(/^github\.com\/([\w.-]+)\/([\w.-]+)$/);
  return match ? parseSourceKey(`${GITHUB_SOURCE}:${match[1]}/${match[2]}/${id.replace(/^\/+/, '')}`) : undefined;
};

/** Whether the key points at a spec document rather than at code. */
export const isSpecKey = (key: SourceKey): boolean => key.path.endsWith('.mdl');

/** The review written beside a spec: `SPEC.mdl` → `SPEC.review.mdl`. */
export const reviewKeyOf = (key: SourceKey): SourceKey => ({
  owner: key.owner,
  repo: key.repo,
  path: key.path.replace(/\.mdl$/, '.review.mdl'),
});

/** A plugin's bundled spec as a key, from its profile's `source` (`https://github.com/o/r/tree/<ref>/<dir>`). */
export const keyFromTreeUrl = (url: string | undefined, file: string): SourceKey | undefined => {
  const match = url?.match(/^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/tree\/[^/]+\/(.+?)\/?$/);
  return match ? { owner: match[1], repo: match[2], path: `${match[3]}/${file}` } : undefined;
};

/** Every key mentioned in a text, with its offsets. */
export const findSourceKeys = (text: string): { from: number; to: number; key: SourceKey; raw: string }[] =>
  [...text.matchAll(SOURCE_KEY_PATTERN)].flatMap((match) => {
    const raw = match[0].replace(/\.+$/, '');
    const key = parseSourceKey(raw);
    return key ? [{ from: match.index, to: match.index + raw.length, key, raw }] : [];
  });
