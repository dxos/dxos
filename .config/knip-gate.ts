//
// Copyright 2026 DXOS.org
//

import type { Preprocessor } from 'knip';
import { relative } from 'node:path';

/**
 * Groupings whose dependencies have been audited and are known clean. `pnpm knip` reports the whole
 * repo so the next grouping can be worked on, while CI gates only on what has already been cleaned:
 * a regression fails the build, the untouched backlog does not.
 *
 * Extend this as each grouping is cleaned — the entry here is what makes the gate meaningful.
 */
const GATED = ['packages/common/', 'packages/core/', 'packages/sdk/', 'packages/devtools/', 'tools/'];

/**
 * `issues` is keyed by issue type: `files` holds absolute paths while every other type maps a
 * repo-relative path to its issues, so both forms have to be normalised before matching. `counters`
 * is what knip's exit code is derived from, so it has to be recounted rather than passed through.
 */
const preprocessor: Preprocessor = (options) => {
  const isGated = (path: string) => {
    const relativePath = path.startsWith('/') ? relative(options.cwd, path) : path;
    return GATED.some((prefix) => relativePath.startsWith(prefix));
  };

  const issues = {} as typeof options.issues;
  const counters = { ...options.counters };

  for (const [type, value] of Object.entries(options.issues)) {
    if (value instanceof Set) {
      const gated = new Set([...value].filter(isGated));
      Reflect.set(issues, type, gated);
      if (type in counters) {
        Reflect.set(counters, type, gated.size);
      }
      continue;
    }

    const gated = Object.fromEntries(Object.entries(value).filter(([file]) => isGated(file)));
    Reflect.set(issues, type, gated);
    if (type in counters) {
      Reflect.set(
        counters,
        type,
        Object.values(gated).reduce((total, group) => total + Object.keys(group).length, 0),
      );
    }
  }

  return { ...options, issues, counters };
};

export default preprocessor;
