//
// Copyright 2026 DXOS.org
//

import { makeBoundedTextDecoder } from '@dxos/util';

/** An Emscripten ES module factory, as `wa-sqlite/dist/wa-sqlite.mjs` exports it. */
export type SqliteModuleFactory<T> = (config?: object) => Promise<T>;

/**
 * Instantiates the wa-sqlite Emscripten module with a {@link makeBoundedTextDecoder} string decoder.
 *
 * Emscripten's glue constructs one `UTF8Decoder` from the global `TextDecoder` synchronously when
 * the factory is called and decodes every TEXT column, column name and VFS path through it for the
 * module's lifetime, so under Safari 18 a long-lived worker fails every query once 2 GiB of text has
 * been read (DX-1298). The global is swapped only for that synchronous call.
 */
export const instantiateSqliteModule = <T>(factory: SqliteModuleFactory<T>, config?: object): Promise<T> => {
  const Native = globalThis.TextDecoder;
  globalThis.TextDecoder = makeBoundedTextDecoder(Native);
  try {
    return factory(config);
  } finally {
    globalThis.TextDecoder = Native;
  }
};
