//
// Copyright 2026 DXOS.org
//

import { type Indexer } from 'storybook/internal/types';

/**
 * Keeps one story file from taking the whole story index down.
 *
 * Storybook indexes a story file when the watcher reports it changed, and caches a failure as that file's entry until
 * the file changes again; any failed entry fails `index.json`, so every story is unreachable. A git checkout, merge or
 * formatter writes files in place, so the watcher can fire while a file is still half-written: the read parses a
 * truncated file, the failure is cached, and the server stays broken although the file on disk is now fine.
 */

export type RetryOptions = {
  /** Further attempts after the first, each re-reading the file. */
  retries?: number;
  /** Wait before the first retry; each later retry waits this much longer again. */
  delayMs?: number;
  /**
   * Index a file that still fails as having no stories, rather than failing the index. Off under a test run, where a
   * story that cannot be indexed must fail the run instead of silently dropping out of it.
   */
  skipOnFailure?: boolean;
  warn?: (message: string) => void;
  sleep?: (ms: number) => Promise<void>;
};

const sleepFor = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** The indexer, re-reading a file that fails to index, and optionally indexing one that keeps failing as empty. */
export const withRetry = (
  indexer: Indexer,
  { retries = 3, delayMs = 250, skipOnFailure = false, warn = console.warn, sleep = sleepFor }: RetryOptions = {},
): Indexer => ({
  ...indexer,
  createIndex: async (fileName, options) => {
    for (let attempt = 0; ; attempt++) {
      try {
        return await indexer.createIndex(fileName, options);
      } catch (err) {
        if (attempt < retries) {
          await sleep(delayMs * (attempt + 1));
          continue;
        }
        if (!skipOnFailure) {
          throw err;
        }
        // Indexed again, and back in the sidebar, the next time the file changes.
        warn(`[dxos:indexers] ${fileName} left out of the story index: ${err instanceof Error ? err.message : err}`);
        return [];
      }
    }
  },
});
