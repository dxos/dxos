//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { isValidSqliteDatabase, OPFS_SQLITE_DB_FILENAME } from '@dxos/client-services';
import { PublicKey } from '@dxos/keys';
import { schema } from '@dxos/protocols/proto';
import type { EchoMetadata } from '@dxos/protocols/proto/dxos/echo/metadata';
import * as OpfsPool from '@dxos/sql-sqlite/OpfsPool';
import * as SqliteClient from '@dxos/sql-sqlite/SqliteClient';
import CRC32 from 'crc-32';

import { exportOpfsSqlite } from './opfs-export';

const EchoMetadataCodec = schema.getCodecForType('dxos.echo.metadata.EchoMetadata');

const HALO_FEED_PARTS = ['key', 'secret_key', 'data', 'tree', 'bitfield', 'signatures'] as const;

export type HypercoreFileSummary = {
  path: string;
  bytes: number;
};

export type HaloFeedSummary = {
  feedKey: string;
  files: Array<{ part: string; bytes: number; missing: boolean }>;
};

export type SqlStorageDiagnosticsResult = {
  elapsedMs: number;
  opfsPool: OpfsPool.FileSummary[];
  asyncExportBytes?: number;
  validSqliteHeader?: boolean;
  integrity?: string;
  dbBytes?: number;
  tableCounts: Record<string, number>;
  hypercore: {
    fileCount: number;
    totalBytes: number;
    files: HypercoreFileSummary[];
  };
  identity?: {
    identityKey: string;
    deviceKey: string;
    controlFeed?: HaloFeedSummary;
    dataFeed?: HaloFeedSummary;
  };
};

const stripMetadataFraming = (bytes: Uint8Array): Uint8Array | undefined => {
  if (bytes.byteLength < 8) {
    return undefined;
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const dataSize = view.getInt32(0, true);
  const checksum = view.getInt32(4, true);
  if (dataSize < 0 || dataSize > bytes.byteLength - 8 || bytes.byteLength !== dataSize + 8) {
    return undefined;
  }
  const payload = bytes.subarray(8, dataSize + 8);
  if (CRC32.buf(payload) !== checksum) {
    return undefined;
  }
  return payload;
};

const decodeMainMetadata = (bytes: Uint8Array | undefined): EchoMetadata | undefined => {
  if (!bytes?.byteLength) {
    return undefined;
  }
  const payload = stripMetadataFraming(bytes);
  if (!payload?.byteLength) {
    return undefined;
  }
  return EchoMetadataCodec.decode(payload);
};

const formatPublicKey = (key: PublicKey | undefined): string | undefined => key?.toHex();

const truncatePublicKeyHex = (hex: string): string => {
  try {
    return PublicKey.fromHex(hex).truncate();
  } catch {
    return hex;
  }
};

const summarizeHaloFeed = (
  feedKeyHex: string | undefined,
  files: HypercoreFileSummary[],
): HaloFeedSummary | undefined => {
  if (!feedKeyHex) {
    return undefined;
  }
  return {
    feedKey: feedKeyHex,
    files: HALO_FEED_PARTS.map((part) => {
      const path = `/sqlite-feeds/feeds/${feedKeyHex}/${part}`;
      const match = files.find((file) => file.path === path);
      return { part, bytes: match?.bytes ?? 0, missing: !match };
    }),
  };
};

/**
 * Inspect OPFS pool + SQLite (no DXOS client boot). Reads the OPFS payload asynchronously,
 * then queries it through an in-memory SQLite (deserialize) — safe on the main thread and
 * never touches the OPFS pool sync access handles.
 */
export const runSqlStorageDiagnostics = async (
  log: (message: string) => void = () => {},
): Promise<SqlStorageDiagnosticsResult> => {
  const started = performance.now();
  log('SQL storage diagnostics (no client boot)…');
  log('');

  log('OPFS pool');
  const opfsPool = await OpfsPool.listFiles();
  for (const file of opfsPool) {
    log(
      `  ${file.name}  path=${file.associatedPath || '(unassigned)'}  payload=${file.payloadBytes.toLocaleString()} bytes`,
    );
  }
  log('');

  log('Async OPFS export (read-only)');
  const exportStarted = performance.now();
  const databaseBytes = await exportOpfsSqlite();
  const asyncExportBytes = databaseBytes.byteLength;
  const validSqliteHeader = isValidSqliteDatabase(databaseBytes);
  log(`  ${asyncExportBytes.toLocaleString()} bytes (${(performance.now() - exportStarted).toFixed(0)} ms)`);
  log(`  header: ${validSqliteHeader ? 'valid SQLite 3' : 'invalid'}`);
  log('');

  log(`SQLite (in-memory copy of ${OPFS_SQLITE_DB_FILENAME})`);

  const sqlResult = await Effect.gen(function* () {
    const sql = yield* SqliteClient.SqliteClient;
    yield* sql.import(databaseBytes);

    const integrity = (yield* sql<{ integrity_check: string }>`PRAGMA integrity_check`)[0]?.integrity_check;
    const pageCount = Number((yield* sql<{ page_count: number }>`PRAGMA page_count`)[0]?.page_count ?? 0);
    const pageSize = Number((yield* sql<{ page_size: number }>`PRAGMA page_size`)[0]?.page_size ?? 0);

    const tableCounts: Record<string, number> = {};
    const countTable = (table: string) =>
      Effect.gen(function* () {
        const exists = Number(
          (yield* sql<{ n: number }>`
            SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name=${table}
          `)[0]?.n ?? 0,
        );
        if (!exists) {
          return 0;
        }
        switch (table) {
          case 'feeds':
            return Number((yield* sql<{ n: number }>`SELECT COUNT(*) AS n FROM feeds`)[0]?.n ?? 0);
          case 'blocks':
            return Number((yield* sql<{ n: number }>`SELECT COUNT(*) AS n FROM blocks`)[0]?.n ?? 0);
          case 'objectMeta':
            return Number((yield* sql<{ n: number }>`SELECT COUNT(*) AS n FROM objectMeta`)[0]?.n ?? 0);
          case 'automerge_chunks':
            return Number((yield* sql<{ n: number }>`SELECT COUNT(*) AS n FROM automerge_chunks`)[0]?.n ?? 0);
          case 'automerge_heads':
            return Number((yield* sql<{ n: number }>`SELECT COUNT(*) AS n FROM automerge_heads`)[0]?.n ?? 0);
          case 'hypercore_files':
            return Number((yield* sql<{ n: number }>`SELECT COUNT(*) AS n FROM hypercore_files`)[0]?.n ?? 0);
          case 'keyring':
            return Number((yield* sql<{ n: number }>`SELECT COUNT(*) AS n FROM keyring`)[0]?.n ?? 0);
          default:
            return 0;
        }
      });

    for (const table of [
      'feeds',
      'blocks',
      'objectMeta',
      'automerge_chunks',
      'automerge_heads',
      'hypercore_files',
      'keyring',
    ] as const) {
      tableCounts[table] = yield* countTable(table);
    }

    const hypercoreRows = yield* sql<{ path: string; bytes: number }>`
      SELECT path, LENGTH(data) AS bytes FROM hypercore_files ORDER BY path
    `;
    const hypercoreFiles = hypercoreRows.map((row) => ({ path: row.path, bytes: Number(row.bytes) }));

    const metaRow = (yield* sql<{ value: Uint8Array }>`SELECT value FROM space_metadata WHERE key = 'main'`)[0];
    const metadata = decodeMainMetadata(metaRow?.value);
    const identityRecord = metadata?.identity;
    const haloSpace = identityRecord?.haloSpace;

    const controlFeedKey = formatPublicKey(haloSpace?.controlFeedKey);
    const dataFeedKey = formatPublicKey(haloSpace?.dataFeedKey);

    return {
      integrity,
      dbBytes: pageCount * pageSize,
      tableCounts,
      hypercore: {
        fileCount: hypercoreFiles.length,
        totalBytes: hypercoreFiles.reduce((sum, file) => sum + file.bytes, 0),
        files: hypercoreFiles,
      },
      identity: identityRecord
        ? {
            identityKey: formatPublicKey(identityRecord.identityKey) ?? '(missing)',
            deviceKey: formatPublicKey(identityRecord.deviceKey) ?? '(missing)',
            controlFeed: summarizeHaloFeed(controlFeedKey, hypercoreFiles),
            dataFeed: summarizeHaloFeed(dataFeedKey, hypercoreFiles),
          }
        : undefined,
    };
  }).pipe(Effect.provide(SqliteClient.layerMemory({})), Effect.scoped, Effect.runPromise);

  log(`  integrity: ${sqlResult.integrity ?? 'unknown'}`);
  log(`  db size:   ${sqlResult.dbBytes?.toLocaleString() ?? '?'} bytes`);
  log(`  hypercore: ${sqlResult.hypercore.fileCount} files, ${sqlResult.hypercore.totalBytes.toLocaleString()} bytes`);
  for (const [table, count] of Object.entries(sqlResult.tableCounts)) {
    log(`  ${table.padEnd(18)} ${count}`);
  }

  if (sqlResult.identity) {
    log('');
    log('Identity (from space_metadata.main)');
    log(`  identity: ${truncatePublicKeyHex(sqlResult.identity.identityKey)}`);
    log(`  device:   ${truncatePublicKeyHex(sqlResult.identity.deviceKey)}`);
    log('  HALO control feed files:');
    for (const file of sqlResult.identity.controlFeed?.files ?? []) {
      log(`    ${file.part.padEnd(12)} ${file.missing ? 'MISSING' : `${file.bytes} bytes`}`);
    }
    log('  HALO data feed files:');
    for (const file of sqlResult.identity.dataFeed?.files ?? []) {
      log(`    ${file.part.padEnd(12)} ${file.missing ? 'MISSING' : `${file.bytes} bytes`}`);
    }
  } else {
    log('  (no identity in space_metadata.main)');
  }

  return {
    elapsedMs: performance.now() - started,
    opfsPool,
    asyncExportBytes,
    validSqliteHeader,
    ...sqlResult,
  };
};
