//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { type SandboxImage } from '@earendil-works/djs';

/**
 * A session as bytes: `DXDJ`, the header's length (u32, little-endian), the header as UTF-8 JSON,
 * then the VM's arena. djs checks the arena against its own build when it loads it; the header names
 * what else must match — this format and the guest bundle — and the session's variables.
 */

const MAGIC = [0x44, 0x58, 0x44, 0x4a];
const FORMAT = 1;

export type Header = {
  readonly format: number;
  /** Hash of the guest bundle the image was built from. */
  readonly bundle: string;
  /** Names the session's programs declared, which the next program may read. */
  readonly names: readonly string[];
  /** What djs keeps beside the arena, to rebind the host functions by name. */
  readonly sandbox: Omit<SandboxImage, 'image'>;
};

export const encode = ({
  header,
  image,
}: {
  header: Omit<Header, 'format' | 'sandbox'>;
  image: SandboxImage;
}): Uint8Array => {
  const { image: arena, ...sandbox } = image;
  const json = new TextEncoder().encode(JSON.stringify({ format: FORMAT, ...header, sandbox } satisfies Header));
  const bytes = new Uint8Array(MAGIC.length + 4 + json.byteLength + arena.byteLength);
  bytes.set(MAGIC, 0);
  new DataView(bytes.buffer).setUint32(MAGIC.length, json.byteLength, true);
  bytes.set(json, MAGIC.length + 4);
  bytes.set(arena, MAGIC.length + 4 + json.byteLength);
  return bytes;
};

export const decode = (bytes: Uint8Array): { header: Header; image: SandboxImage } => {
  if (bytes.byteLength < MAGIC.length + 4 || MAGIC.some((byte, index) => bytes[index] !== byte)) {
    throw new Error('Not a code-mode-djs snapshot.');
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const length = view.getUint32(MAGIC.length, true);
  const start = MAGIC.length + 4;
  const header = parseHeader(new TextDecoder().decode(bytes.subarray(start, start + length)));
  return { header, image: { ...header.sandbox, image: bytes.slice(start + length) } };
};

const parseHeader = (text: string): Header => {
  const parsed: unknown = JSON.parse(text);
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('format' in parsed) ||
    !('bundle' in parsed) ||
    !('names' in parsed) ||
    !('sandbox' in parsed)
  ) {
    throw new Error('The snapshot header is malformed.');
  }
  const { format, bundle, names, sandbox } = parsed;
  if (format !== FORMAT) {
    throw new Error(`The snapshot is format ${String(format)}; this engine reads format ${FORMAT}.`);
  }
  if (typeof bundle !== 'string' || !Array.isArray(names) || !isSandboxHeader(sandbox)) {
    throw new Error('The snapshot header is malformed.');
  }
  return { format, bundle, names: names.filter((name): name is string => typeof name === 'string'), sandbox };
};

const isNamedHandles = (value: unknown): value is [string, number][] =>
  Array.isArray(value) &&
  value.every((pair) => Array.isArray(pair) && typeof pair[0] === 'string' && typeof pair[1] === 'number');

const isHandles = (value: unknown): value is [number, number][] =>
  Array.isArray(value) &&
  value.every((pair) => Array.isArray(pair) && typeof pair[0] === 'number' && typeof pair[1] === 'number');

const isStrings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string');

const isSandboxHeader = (value: unknown): value is Header['sandbox'] =>
  typeof value === 'object' &&
  value !== null &&
  'functions' in value &&
  isStrings(value.functions) &&
  'namespaces' in value &&
  isNamedHandles(value.namespaces) &&
  'fnHandles' in value &&
  isHandles(value.fnHandles) &&
  'globals' in value &&
  isStrings(value.globals) &&
  (!('clock' in value) || value.clock === undefined || typeof value.clock === 'number');
