//
// Copyright 2026 DXOS.org
//

import { GITHUB_SOURCE, type SourceKey, parseSourceKey, repoId } from '@dxos/deus/review';

/** A key as stored in an object's meta keys; plugin-projects already writes `github.com/dxos/dxos` + repo path. */
export type MetaKey = { source: string; id: string };

/** The meta key a synced object carries: the repository as `source`, the file path as `id`. */
export const toMetaKey = (key: SourceKey): MetaKey => ({ source: `github.com/${repoId(key)}`, id: key.path });

/** Inverse of {@link toMetaKey}; undefined for keys from other sources. */
export const fromMetaKey = ({ source, id }: MetaKey): SourceKey | undefined => {
  const match = source.match(/^github\.com\/([\w.-]+)\/([\w.-]+)$/);
  return match ? parseSourceKey(`${GITHUB_SOURCE}:${match[1]}/${match[2]}/${id.replace(/^\/+/, '')}`) : undefined;
};

/** A plugin's bundled spec as a key, from its profile's `source` (`https://github.com/o/r/tree/<ref>/<dir>`). */
export const keyFromTreeUrl = (url: string | undefined, file: string): SourceKey | undefined => {
  const match = url?.match(/^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/tree\/[^/]+\/(.+?)\/?$/);
  return match ? { owner: match[1], repo: match[2], path: `${match[3]}/${file}` } : undefined;
};
