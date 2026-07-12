//
// Copyright 2026 DXOS.org
//

import { Panproto } from '@dxos/echo-panproto';

import echoBookLexicon from './lexicons/echo.book.json';

/**
 * The scalar value transforms in the Book <-> buzz.bookhive.book mapping, authored as declarative
 * Panproto {@link Panproto.Expr} ASTs and executed by the vendored panproto engine — the reusable
 * standard for ECHO <-> lexicon value rewrites. Structural adaptation (refs, arrays, nesting) is the
 * codec's job (book-codec.ts), never the bridge's. Two transforms today:
 *
 * - `status`: bare literal in ECHO <-> `buzz.bookhive.defs#<value>` knownValue reference on the wire.
 * - `startedAt`/`finishedAt`: date-only (`Format.Date`, `2018-11-13`) in ECHO <-> full ISO datetime
 *   (`2018-11-13T00:00:00.000Z`, the lexicon's required `datetime` format) on the wire.
 */
const STATUS_PREFIX = 'buzz.bookhive.defs#';

// A date-only value denotes midnight UTC when widened to the wire's datetime; decode slices it back.
const MIDNIGHT_UTC = 'T00:00:00.000Z';
const ISO_DATE_LENGTH = 10; // `YYYY-MM-DD`.

const DATE_FIELDS = ['startedAt', 'finishedAt'] as const;

// The vertex anchoring the flat scalar projection; matches `echo.book`'s record body.
const ROOT_VERTEX = 'echo.book:body';

type Direction = 'encode' | 'decode';

/**
 * The field transforms applicable to a record, in the given direction. A transform is included only
 * when its field is present — panproto binds the field by name, so a transform over an absent field
 * would fail to resolve.
 */
const bookTransforms = (record: Record<string, unknown>, direction: Direction): Panproto.FieldTransform[] => {
  const transforms: Panproto.FieldTransform[] = [];

  if (typeof record.status === 'string') {
    transforms.push({
      vertex: ROOT_VERTEX,
      key: 'status',
      expr:
        direction === 'encode'
          ? Panproto.prefix(STATUS_PREFIX, Panproto.field('status'))
          : Panproto.stripPrefix(STATUS_PREFIX, Panproto.field('status')),
    });
  }

  for (const key of DATE_FIELDS) {
    if (typeof record[key] === 'string') {
      transforms.push({
        vertex: ROOT_VERTEX,
        key,
        expr:
          direction === 'encode'
            ? Panproto.suffix(MIDNIGHT_UTC, Panproto.field(key)) // date -> datetime
            : Panproto.slice(Panproto.field(key), 0, ISO_DATE_LENGTH), // datetime -> date
      });
    }
  }

  return transforms;
};

const runBookTransforms = (record: Record<string, unknown>, direction: Direction): Promise<Record<string, unknown>> => {
  const fieldTransforms = bookTransforms(record, direction);
  if (fieldTransforms.length === 0) {
    return Promise.resolve(record);
  }
  return Panproto.transform({ lexicon: echoBookLexicon, spec: { rootVertex: ROOT_VERTEX, fieldTransforms }, record });
};

/** Apply the ECHO -> wire scalar value transforms (status prefix, date widening). */
export const encodeBookScalars = (record: Record<string, unknown>): Promise<Record<string, unknown>> =>
  runBookTransforms(record, 'encode');

/** Apply the wire -> ECHO scalar value transforms, inverse of {@link encodeBookScalars}. */
export const decodeBookScalars = (record: Record<string, unknown>): Promise<Record<string, unknown>> =>
  runBookTransforms(record, 'decode');
