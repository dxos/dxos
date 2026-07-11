//
// Copyright 2026 DXOS.org
//

import { Panproto } from '@panproto/core';

import bookLexicon from './lexicons/buzz.bookhive.book.json';
import echoLexicon from './lexicons/echo.book.json';

// Fields shared 1:1 between the ECHO projection and the buzz.bookhive.book record. `authors` is a
// tab-separated string on BOTH sides (the array↔string join lives in the projection boundary), so
// every field is a pure structural map — Panproto owns the whole record transformation.
const SCALAR_FIELDS = [
  'title',
  'authors',
  'hiveId',
  'createdAt',
  'status',
  'stars',
  'review',
  'startedAt',
  'finishedAt',
  'hiveBookUri',
] as const;

const ECHO_ROOT = 'echo.book';
const BOOK_ROOT = 'buzz.bookhive.book';

export type StructuralCodec = {
  encode: (boundary: Record<string, unknown>) => Record<string, unknown>;
  decode: (record: Record<string, unknown>) => Record<string, unknown>;
};

let enginePromise: Promise<StructuralCodec> | undefined;

const buildEngine = async (): Promise<StructuralCodec> => {
  const panproto = await Panproto.init();
  const echo = panproto.parseLexicon(echoLexicon);
  const book = panproto.parseLexicon(bookLexicon);

  const buildMigration = (from: ReturnType<typeof panproto.parseLexicon>, to: typeof echo, fromRoot: string, toRoot: string) => {
    let builder = panproto.migration(from, to).map(fromRoot, toRoot).map(`${fromRoot}:body`, `${toRoot}:body`);
    for (const field of SCALAR_FIELDS) {
      builder = builder.map(`${fromRoot}:body.${field}`, `${toRoot}:body.${field}`);
    }
    return builder.compile();
  };

  const forward = buildMigration(echo, book, ECHO_ROOT, BOOK_ROOT);
  const reverse = buildMigration(book, echo, BOOK_ROOT, ECHO_ROOT);

  return {
    // `liftJson` returns `unknown` (untyped WASM boundary); both directions are object records.
    encode: (boundary) => forward.liftJson(boundary, `${ECHO_ROOT}:body`) as Record<string, unknown>,
    decode: (record) => reverse.liftJson(record, `${BOOK_ROOT}:body`) as Record<string, unknown>,
  };
};

/** Lazily initialize Panproto's WASM lens engine and build the structural migrations (memoized). */
export const getStructuralCodec = (): Promise<StructuralCodec> => (enginePromise ??= buildEngine());
