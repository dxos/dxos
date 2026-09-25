//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Contract from './Contract.ts';

/** Own property Automerge sets on a RawString, whose class this package does not import. */
const IMMUTABLE_STRING = Symbol.for('_am_immutableString');

// A tagged leaf is a one-key object under a `/` key, which ECHO already reserves for references.
const RAW_STRING = '/rawString';
const BYTES = '/bytes';
const DATE = '/date';
/** Wraps a plain object that happens to look like a tag, so that it is not read as one. */
const ESCAPE = '/escape';
const TAGS = new Set([RAW_STRING, BYTES, DATE, ESCAPE]);

/** Builds the values this package cannot construct without Automerge. */
export type DecodeOptions = { rawString: (text: string) => unknown };

/**
 * Copies a mirror value with its RawString, byte and date leaves replaced by tags, since the worker
 * transport sends values as JSON. Returns the value itself when nothing in it needs a tag.
 */
export const encode = (value: unknown): unknown => {
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  if (Array.isArray(value)) {
    const entries = value.map(encode);
    return entries.some((entry, index) => entry !== value[index]) ? entries : value;
  }
  if (Object.hasOwn(value, IMMUTABLE_STRING)) {
    return { [RAW_STRING]: String(value) };
  }
  if (value instanceof Uint8Array) {
    return { [BYTES]: toBase64(value) };
  }
  if (value instanceof Date) {
    return { [DATE]: value.getTime() };
  }
  let changed = false;
  const copy: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    copy[key] = encode(entry);
    changed ||= copy[key] !== entry;
  }
  if (looksTagged(copy)) {
    return { [ESCAPE]: copy };
  }
  return changed ? copy : value;
};

/** Restores the leaves {@link encode} tagged. */
export const decode = (value: unknown, options: DecodeOptions): unknown => {
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => decode(entry, options));
  }
  const entries = Object.entries(value);
  if (entries.length === 1) {
    const [[key, entry]] = entries;
    if (key === RAW_STRING && typeof entry === 'string') {
      return options.rawString(entry);
    }
    if (key === BYTES && typeof entry === 'string') {
      return fromBase64(entry);
    }
    if (key === DATE && typeof entry === 'number') {
      return new Date(entry);
    }
    if (key === ESCAPE && typeof entry === 'object' && entry !== null && !Array.isArray(entry)) {
      return restoreEntries(Object.entries(entry), options);
    }
  }
  return restoreEntries(entries, options);
};

const restoreEntries = (entries: [string, unknown][], options: DecodeOptions): Record<string, unknown> =>
  Object.fromEntries(entries.map(([key, entry]) => [key, decode(entry, options)]));

const looksTagged = (value: Record<string, unknown>): boolean => {
  const keys = Object.keys(value);
  return keys.length === 1 && TAGS.has(keys[0]);
};

/** Chunked, since spreading a large array into `String.fromCharCode` overflows the stack. */
const toBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
};

const fromBase64 = (text: string): Uint8Array => Uint8Array.from(atob(text), (char) => char.charCodeAt(0));

/** Tags the values of an event bound for a tab; only its value-typed fields can hold Automerge leaves. */
export const encodeEvent = (event: Contract.DocumentEvent): Contract.DocumentEvent => mapEventValues(event, encode);

/** Restores the values of an event the worker sent. */
export const decodeEvent = (event: Contract.DocumentEvent, options: DecodeOptions): Contract.DocumentEvent =>
  mapEventValues(event, (value) => decode(value, options));

/** Tags the ops of a batch's changes bound for the worker. */
export const encodeChanges = (changes: readonly (readonly unknown[])[]): unknown[][] =>
  changes.map((ops) => ops.map(encode));

/** Restores the ops of a batch's changes a tab sent. */
export const decodeChanges = (changes: readonly (readonly unknown[])[], options: DecodeOptions): unknown[][] =>
  changes.map((ops) => ops.map((op) => decode(op, options)));

const mapEventValues = (event: Contract.DocumentEvent, map: (value: unknown) => unknown): Contract.DocumentEvent => {
  switch (event.type) {
    case 'snapshot':
    case 'copy':
      return { ...event, value: map(event.value) };
    case 'entry':
      return { ...event, entry: { ...event.entry, ops: event.entry.ops.map(map) } };
    case 'recovered':
      return { ...event, entries: event.entries.map((entry) => ({ ...entry, ops: entry.ops.map(map) })) };
    default:
      return event;
  }
};
