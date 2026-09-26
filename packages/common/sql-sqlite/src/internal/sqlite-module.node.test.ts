//
// Copyright 2026 DXOS.org
//

import * as WaSqlite from '@effect/wa-sqlite';
// oxlint-disable-next-line @dxos/rules/effect-subpath-imports
import EffectSQLiteESMFactory from '@effect/wa-sqlite/dist/wa-sqlite.mjs';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { afterEach, describe, test } from 'vitest';

// @ts-expect-error - No type declarations for this module.
import DxosSQLiteESMFactory from '@dxos/wa-sqlite/dist/wa-sqlite.mjs';

import { type SqliteModuleFactory, instantiateSqliteModule } from './sqlite-module.ts';

const require = createRequire(import.meta.url);

/** WebKit's `String::MaxLength`, the cap its TextDecoder compares a running byte count against. */
const WEBKIT_STRING_MAX_LENGTH = 2 ** 31 - 1;

/**
 * `TextDecoder::decode` as WebKit's safari-7619 to safari-7621 branches (Safari 18, the engine of a
 * macOS Tauri build) implement it: `m_decodedBytes` accumulates across every call on one instance,
 * streaming or not, and once it passes `String::MaxLength` every later call throws an empty-message
 * RangeError, which WebKit's bindings render as "Bad value". Safari 26 (7622) removed the check.
 */
class WebKitTextDecoder extends TextDecoder {
  #decodedBytes = 0;

  override decode(input?: AllowSharedBufferSource, options?: TextDecodeOptions): string {
    this.#decodedBytes += input?.byteLength ?? 0;
    if (this.#decodedBytes > WEBKIT_STRING_MAX_LENGTH) {
      throw new RangeError('Bad value');
    }
    return super.decode(input, options);
  }
}

const NativeTextDecoder = globalThis.TextDecoder;

// Production bundles alias `@effect/wa-sqlite` to the `@dxos` fork; both glue builds are covered.
const builds: ReadonlyArray<[name: string, factory: SqliteModuleFactory<unknown>, wasm: string]> = [
  ['@dxos/wa-sqlite', DxosSQLiteESMFactory, require.resolve('@dxos/wa-sqlite/dist/wa-sqlite.wasm')],
  ['@effect/wa-sqlite', EffectSQLiteESMFactory, require.resolve('@effect/wa-sqlite/dist/wa-sqlite.wasm')],
];

describe('instantiateSqliteModule', () => {
  afterEach(() => {
    globalThis.TextDecoder = NativeTextDecoder;
  });

  test.for(builds)(
    '%s keeps decoding TEXT after 2 GiB under WebKit TextDecoder accounting',
    { timeout: 300_000 },
    async ([_name, factory, wasm], { expect }) => {
      globalThis.TextDecoder = WebKitTextDecoder;
      const sqlite3 = WaSqlite.Factory(await instantiateSqliteModule(factory, { wasmBinary: readFileSync(wasm) }));
      const db = await sqlite3.open_v2(':memory:');

      // One legitimate row read repeatedly: the fault is the decoder's running total, not a value.
      const value = 'x'.repeat(64 * 1024 * 1024);
      await sqlite3.exec(db, 'CREATE TABLE doc (body TEXT NOT NULL)');
      for await (const stmt of sqlite3.statements(db, 'INSERT INTO doc (body) VALUES (?)')) {
        sqlite3.bind_collection(stmt, [value]);
        await sqlite3.step(stmt);
      }

      const reads = Math.ceil(WEBKIT_STRING_MAX_LENGTH / value.length) + 1;
      for (let read = 0; read < reads; read++) {
        for await (const stmt of sqlite3.statements(db, 'SELECT body FROM doc')) {
          expect(await sqlite3.step(stmt)).toBe(WaSqlite.SQLITE_ROW);
          const [body] = sqlite3.row(stmt);
          expect(typeof body === 'string' ? body.length : body).toBe(value.length);
        }
      }

      await sqlite3.close(db);
    },
  );
});
