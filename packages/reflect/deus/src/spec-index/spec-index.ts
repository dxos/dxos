//
// Copyright 2026 DXOS.org
//

import { parseMdlBlocks } from '../extension/blocks.ts';
import { frontmatter, reqIds } from './parse.ts';

/** One spec in the index: where it lives and every id a reference into it can name. */
export type SpecEntry = {
  /** POSIX, repo-relative. */
  path: string;
  /** Every block id and `req` id of the spec. */
  items: string[];
};

export type SpecIndex = {
  /** Specs by frontmatter id; a duplicated id is absent. */
  specs: Record<string, SpecEntry>;
  /** Each duplicated id with every path that claims it. */
  duplicates: Record<string, string[]>;
};

/** Whether the index holds a tracked `.mdl` path; `lang/examples/` is excluded because its files share one id. */
export const isIndexedSpec = (path: string): boolean =>
  !path.endsWith('.review.mdl') && !path.includes('__fixtures__') && !path.includes('/deus/lang/examples/');

const specItems = (text: string): string[] => [
  ...new Set(parseMdlBlocks(text).flatMap(({ id, body }) => [...(id ? [id] : []), ...reqIds(body)])),
];

/** Indexes spec texts by frontmatter id; a file with no id is skipped. */
export const indexSpecs = (files: { path: string; text: string }[]): SpecIndex => {
  const claims = new Map<string, { path: string; items: string[] }[]>();
  for (const { path, text } of files) {
    const id = frontmatter(text).id;
    if (id) {
      claims.set(id, [...(claims.get(id) ?? []), { path, items: specItems(text) }]);
    }
  }
  const index: SpecIndex = { specs: {}, duplicates: {} };
  for (const [id, entries] of claims) {
    if (entries.length === 1) {
      index.specs[id] = entries[0];
    } else {
      index.duplicates[id] = entries.map((entry) => entry.path);
    }
  }
  return index;
};
