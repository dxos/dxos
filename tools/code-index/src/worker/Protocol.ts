//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as Rpc from 'effect/rpc/Rpc';
import * as RpcGroup from 'effect/rpc/RpcGroup';
import * as Schema from 'effect/Schema';

/**
 * The contract between the crawling main thread and the parsing workers. Workers receive a batch of
 * paths and return each file's document as N-Triples — they never touch a database, so nothing
 * contends on SQLite or RocksDB.
 */

export const FileRef = Schema.Struct({
  path: Schema.String,
  mtime: Schema.Number,
});

export type FileRef = typeof FileRef.Type;

/**
 * A file's ledger record and its document as N-Triples, encoded in the worker: the main thread
 * commits it as is, with no JSON-LD to parse or document to validate on the one thread that writes.
 */
export const AnalyzedFile = Schema.Struct({
  path: Schema.String,
  mtime: Schema.Number,
  language: Schema.String,
  size: Schema.Number,
  hash: Schema.String,
  triples: Schema.String,
});

export type AnalyzedFile = typeof AnalyzedFile.Type;

export const SkippedFile = Schema.Struct({
  path: Schema.String,
  reason: Schema.String,
});

export type SkippedFile = typeof SkippedFile.Type;

export const Rpcs = RpcGroup.make(
  Rpc.make('AnalyzeBatch', {
    payload: { root: Schema.String, files: Schema.Array(FileRef) },
    success: Schema.Struct({
      analyzed: Schema.Array(AnalyzedFile),
      skipped: Schema.Array(SkippedFile),
      /** Worker time spent analyzing the batch's files and encoding their documents. */
      analyzeMs: Schema.Number,
      encodeMs: Schema.Number,
    }),
  }),
);
