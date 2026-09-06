//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as Schema from 'effect/Schema';
import * as Rpc from 'effect/unstable/rpc/Rpc';
import * as RpcGroup from 'effect/unstable/rpc/RpcGroup';

import * as Ontology from '../Ontology.ts';

/**
 * The contract between the crawling main thread and the parsing workers. Workers receive a batch of
 * paths and return one JSON-LD document per file — they never touch a database, so nothing
 * contends on SQLite or LevelDB.
 */

export const FileRef = Schema.Struct({
  path: Schema.String,
  mtime: Schema.Number,
});

export type FileRef = typeof FileRef.Type;

export const AnalyzedFile = Schema.Struct({
  path: Schema.String,
  mtime: Schema.Number,
  // JSON-LD text on the wire, a decoded document on both ends (see `design/ONTOLOGY.md`).
  document: Schema.fromJsonString(Ontology.FileDocument),
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
    }),
  }),
);
