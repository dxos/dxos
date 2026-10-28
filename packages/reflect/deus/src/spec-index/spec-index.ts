//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as FileSystem from 'effect/FileSystem';
import * as Path from 'effect/Path';

import { git, lines } from '../cli/git.ts';
import { frontmatter } from '../cli/review.ts';
import { parseMdlBlocks } from '../extension/check.ts';

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

const specItems = (text: string): string[] => [
  ...new Set(
    parseMdlBlocks(text).flatMap(({ id, body }) => [
      ...(id ? [id] : []),
      ...body.split('\n').flatMap((line) => {
        const req = line.match(/^\s+req\s+([A-Za-z][\w.-]*)\s*:/);
        return req ? [req[1]] : [];
      }),
    ]),
  ),
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

const isSpec = (file: string): boolean => !file.endsWith('.review.mdl') && !file.includes('__fixtures__');

/** Indexes every tracked `.mdl` spec under `root`, leaving out reviews and fixtures. */
export const buildSpecIndex = Effect.fnUntraced(function* (root: string) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const tracked = lines(yield* git(root, '-c', 'core.quotePath=false', 'ls-files', '--', '*.mdl')).filter(isSpec);
  const files = yield* Effect.forEach(tracked, (file) =>
    fs.readFileString(path.join(root, file)).pipe(
      Effect.map((text) => ({ path: file, text })),
      // A tracked file deleted in the working tree is no longer a spec.
      Effect.option,
    ),
  );
  return indexSpecs(files.flatMap((file) => (file._tag === 'Some' ? [file.value] : [])));
});
