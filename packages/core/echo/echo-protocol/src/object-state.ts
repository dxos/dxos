//
// Copyright 2026 DXOS.org
//

import { decodeUint8ArrayFromJson, encodeUint8ArrayToJson, isEncodedUint8Array } from '@dxos/util';

import { type RawString } from './automerge.ts';
import { type EntityStructure } from './document-structure.ts';

/**
 * An object as the index read it from its document: the raw structure, and the document heads it
 * was read at, so a write made against it can be replayed at exactly that version.
 */
export type ObjectState = {
  heads: string[];
  structure: EntityStructure;
};

/** A raw string as JSON, in the DAG-JSON `{ '/': { … } }` form that bytes and references share. */
type EncodedRawString = { '/': { rawString: string } };

const isEncodedRawString = (value: unknown): value is EncodedRawString => {
  if (typeof value !== 'object' || value === null || Array.isArray(value) || Object.keys(value).length !== 1) {
    return false;
  }
  if (!('/' in value)) {
    return false;
  }
  const inner = value['/'];
  return (
    typeof inner === 'object' &&
    inner !== null &&
    Object.keys(inner).length === 1 &&
    'rawString' in inner &&
    typeof inner.rawString === 'string'
  );
};

export type EncodeEntityStructureOptions = {
  /** The text of a document raw string, `undefined` for anything else; this package does not depend on Automerge. */
  readRawString: (value: unknown) => string | undefined;
};

/**
 * Serializes an entity structure read from a document without loss: bytes and raw strings, which
 * plain JSON would flatten into objects and text, are tagged.
 */
export const encodeEntityStructure = (structure: EntityStructure, options: EncodeEntityStructureOptions): string =>
  JSON.stringify(encodeValue(structure, options));

const encodeValue = (value: unknown, options: EncodeEntityStructureOptions): unknown => {
  const rawString = options.readRawString(value);
  if (rawString !== undefined) {
    return { '/': { rawString } } satisfies EncodedRawString;
  }
  if (value instanceof Uint8Array) {
    return encodeUint8ArrayToJson(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => encodeValue(item, options));
  }
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encodeValue(item, options)]));
  }
  return value;
};

export type DecodeEntityStructureOptions = {
  /** Builds the document's raw string type; this package does not depend on Automerge. */
  makeRawString: (value: string) => RawString;
};

/** Inverse of {@link encodeEntityStructure}. */
export const decodeEntityStructure = (json: string, options: DecodeEntityStructureOptions): EntityStructure =>
  JSON.parse(json, (_key, value) => {
    if (isEncodedUint8Array(value)) {
      return decodeUint8ArrayFromJson(value);
    }
    if (isEncodedRawString(value)) {
      return options.makeRawString(value['/'].rawString);
    }
    return value;
  });
