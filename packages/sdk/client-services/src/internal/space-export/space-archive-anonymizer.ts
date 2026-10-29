//
// Copyright 2026 DXOS.org
//

import * as Automerge from '@automerge/automerge';

import { type FeedArchiveBlock, SpaceArchiveFileStructure, type SpaceArchiveMetadata } from '@dxos/protocols';

//
// Anonymizes a space archive: every user-content string and number is replaced through a seeded, deterministic map
// while keys, types, references and composition stay as they are, so the result imports and queries like the original.
//
// What is kept verbatim:
//  - Archive metadata except `exportedBy` (version, space id, root url, createdAt) and feed block metadata (actor,
//    sequence, position, timestamp).
//  - Document ids and file names; in each ECHO document `version`, `access`, `links`, `branches`, `retired` and every
//    entity's `system` section (kind, type, parent, source/target, deleted, createdAt) and `meta` except foreign keys.
//  - In feed objects, `id` and every `@`-prefixed key (`@type`, `@uri`, `@meta` except foreign keys, `@deleted`).
//  - All property names, booleans, nulls, dates and the shape of every array and map.
//  - Strings that are structural by pattern: `echo:` / `dxn:` / `automerge:` URIs, ULIDs, space ids, ISO dates,
//    `org.dxos.*` identifiers, reference targets (the `/` key), and values equal to a property name of the same entity
//    (map-key references such as drawing shape ids or JSON-schema `required` lists, whose keys are kept anyway).
//  - Enum-like values under {@link ENUM_KEYS} when they are identifier-shaped (no whitespace), so schema literals decode.
//  - Numbers under {@link KEEP_NUMBER_KEYS} and integers in the epoch-millisecond range (timestamps).
//
// What is replaced:
//  - Strings of at most {@link SHORT_STRING_LIMIT} characters without whitespace are id-like; longer strings are prose.
//    Both are split into letter/digit runs and each run is mapped on its own, keeping every separator, so punctuation,
//    whitespace, markdown and URL/email shape survive: letter runs become pronounceable fake words of the same length
//    and case, digit runs become digits of the same length, mixed runs keep their per-character class (hex stays hex).
//    The run map is global, so equal strings get equal replacements across documents and feeds.
//  - A few runs carry no content and are kept so URLs and DIDs stay valid ({@link KEEP_TOKENS}).
//  - Numbers keep sign, integer-ness and digit count; integers share the digit-run map so `number: 123` and `/pull/123`
//    stay consistent.
//  - Byte arrays become seeded random bytes of the same length; counters and raw (immutable) strings keep their type.
//
// Automerge history is not carried over: each document is rewritten as a single change, so heads change and any heads
// or cursors stored in data (e.g. `branches.*.baseHeads`) no longer resolve.
//

/** Strings longer than this, or containing whitespace, are treated as prose. */
export const SHORT_STRING_LIMIT = 32;

/** Keys whose identifier-shaped string values are enum literals checked by schemas. */
export const ENUM_KEYS: ReadonlySet<string> = new Set([
  '$schema',
  '_tag',
  'align',
  'alignHorizontal',
  'alignVertical',
  'arrowheadEnd',
  'arrowheadStart',
  'backgroundGrid',
  'color',
  'dash',
  'disposition',
  'effort',
  'end',
  'entityKind',
  'errorCode',
  'estimate',
  'event',
  'fill',
  'finishReason',
  'font',
  'geo',
  'harness',
  'hue',
  'icon',
  'index',
  'kind',
  'labelColor',
  'layer',
  'lineStyle',
  'mediaType',
  'operationIcon',
  'outcome',
  'previousStatus',
  'priority',
  'role',
  'size',
  'state',
  'status',
  'terminal',
  'textAlign',
  'theme',
  'type',
  'typeName',
  'verticalAlign',
  'viewType',
  'z',
]);

/** Keys whose string values are kept whatever their shape, since they identify schemas rather than content. */
const VERBATIM_STRING_KEYS: ReadonlySet<string> = new Set(['/', '$id', 'typename', 'version']);

/** Keys whose numeric values are structural (versions, render parameters with bounded ranges). */
export const KEEP_NUMBER_KEYS: ReadonlySet<string> = new Set([
  'agentVersion',
  'gridSize',
  'index',
  'opacity',
  'rotation',
  'scale',
  'tone',
  'version',
]);

/** Letter runs kept as is (lower-cased match) so URLs, emails and DIDs keep a valid scheme and host shape. */
export const KEEP_TOKENS: ReadonlySet<string> = new Set([
  'ai',
  'app',
  'co',
  'com',
  'did',
  'dxn',
  'dxos',
  'echo',
  'github',
  'halo',
  'http',
  'https',
  'io',
  'key',
  'mailto',
  'net',
  'network',
  'org',
  'www',
]);

/** Top-level ECHO document sections that hold no user content. */
const STRUCTURAL_DOCUMENT_KEYS: ReadonlySet<string> = new Set([
  'access',
  'branches',
  'experimental_spaceKey',
  'links',
  'retired',
  'version',
]);

const ULID = /^[0-9A-HJKMNP-TV-Z]{26}$/;
const SPACE_ID = /^B[A-Z2-7]{32}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;
const STRUCTURAL_PREFIX = /^(?:echo|dxn|automerge):/;
const DXOS_IDENTIFIER = /^org\.dxos\.[\w.-]+$/;
const IDENTIFIER_SHAPED = /^[\w$.:/@+-]{1,64}$/;
const WORD = /[\p{L}\p{N}]+/gu;
const EPOCH_MS_MIN = 1e12;
const EPOCH_MS_MAX = 1e13;

const CONSONANTS = 'bcdfghjklmnprstvwz';
const VOWELS = 'aeiou';
const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const UPPER = LOWER.toUpperCase();
const DIGITS = '0123456789';
const MAX_ATTEMPTS = 32;

/** Decides how a string is treated by the anonymizer. */
export const classifyString = (value: string): 'structural' | 'id' | 'prose' => {
  if (isStructuralString(value)) {
    return 'structural';
  }
  return value.length > SHORT_STRING_LIMIT || /\s/.test(value) ? 'prose' : 'id';
};

const isStructuralString = (value: string): boolean =>
  STRUCTURAL_PREFIX.test(value) ||
  ULID.test(value) ||
  SPACE_ID.test(value) ||
  ISO_DATE.test(value) ||
  DXOS_IDENTIFIER.test(value);

/** 53-bit string hash (cyrb53), used to seed a per-token generator so the map does not depend on traversal order. */
const hash = (text: string, seed: number): number => {
  let first = 0xdeadbeef ^ seed;
  let second = 0x41c6ce57 ^ seed;
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index);
    first = Math.imul(first ^ code, 2654435761);
    second = Math.imul(second ^ code, 1597334677);
  }
  first = Math.imul(first ^ (first >>> 16), 2246822507) ^ Math.imul(second ^ (second >>> 13), 3266489909);
  second = Math.imul(second ^ (second >>> 16), 2246822507) ^ Math.imul(first ^ (first >>> 13), 3266489909);
  return 4294967296 * (2097151 & second) + (first >>> 0);
};

/** Mulberry32 generator returning integers in [0, bound). */
const generator = (seed: number) => {
  let state = seed >>> 0;
  return (bound: number): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return Math.floor((((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296) * bound);
  };
};

type Context = {
  key: string | undefined;
  /** Property names of the enclosing entity. */
  keys: ReadonlySet<string>;
};

export type AnonymizerOptions = {
  seed?: number;
};

/**
 * Deterministic content anonymizer for ECHO documents and feed objects.
 * One instance carries the token map, so every value passed through it shares the same replacements.
 */
export class Anonymizer {
  readonly #seed: number;
  readonly #tokens = new Map<string, string>();
  readonly #outputs = new Set<string>();
  /** Runs of strings kept verbatim by a rule, which may legitimately share a run with replaced content. */
  readonly #kept = new Set<string>();
  readonly #keep = (value: string): void => {
    for (const [token] of value.matchAll(WORD)) {
      this.#kept.add(token);
    }
  };

  constructor({ seed = 1 }: AnonymizerOptions = {}) {
    this.#seed = seed;
  }

  /**
   * Original runs of at least `minLength` characters that were replaced and never kept or generated elsewhere, so any
   * occurrence of one in the output is residue of user content.
   */
  replacedTokens(minLength = 7): Set<string> {
    const tokens = new Set<string>();
    for (const [input, output] of this.#tokens) {
      if (input !== output && input.length >= minLength && !this.#kept.has(input) && !this.#outputs.has(input)) {
        tokens.add(input);
      }
    }
    return tokens;
  }

  /** The run map, for debugging only: it reverses the anonymization. */
  mapping(): Record<string, string> {
    return Object.fromEntries(this.#tokens);
  }

  /** Passes a structural value through unchanged, recording its runs so the residue check does not flag them. */
  keep<T>(value: T): T {
    copy(value, this.#keep);
    return value;
  }

  /** Replaces a free-standing string (no key context). */
  string(value: string): string {
    return this.#string(value, { key: undefined, keys: new Set() });
  }

  /** Replaces a free-standing number (no key context). */
  number(value: number): number {
    return this.#number(value, { key: undefined, keys: new Set() });
  }

  /** Anonymizes an ECHO document (an Automerge proxy or plain value) into a plain value with Automerge types kept. */
  document(doc: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(doc).map(([key, value]) => {
        this.#keep(key);
        if (STRUCTURAL_DOCUMENT_KEYS.has(key)) {
          return [key, this.#copy(value)];
        }
        if (key === 'objects' && isRecord(value)) {
          return [key, mapRecord(value, (entity) => (isRecord(entity) ? this.#entity(entity) : this.#copy(entity)))];
        }
        return [key, this.#value(value, { key, keys: collectKeys(value) })];
      }),
    );
  }

  /** Anonymizes a JSON-encoded ECHO object as stored in a feed block. */
  feedObject(object: Record<string, unknown>): Record<string, unknown> {
    const keys = collectKeys(object);
    return Object.fromEntries(
      Object.entries(object).map(([key, value]) => {
        this.#keep(key);
        if (key === '@meta' && isRecord(value)) {
          return [key, this.#meta(value)];
        }
        if (key === 'id' || key.startsWith('@')) {
          return [key, this.#copy(value)];
        }
        return [key, this.#value(value, { key, keys })];
      }),
    );
  }

  /** Anonymizes the payload of a feed block, keeping its ordering metadata. */
  feedBlock(block: FeedArchiveBlock): FeedArchiveBlock {
    for (const [key, value] of Object.entries(block)) {
      this.#keep(key);
      if (key !== 'data' && value !== null) {
        this.#keep(String(value));
      }
    }
    const decoded: unknown = JSON.parse(Buffer.from(block.data, 'base64').toString('utf8'));
    const anonymized = isRecord(decoded)
      ? this.feedObject(decoded)
      : this.#value(decoded, { key: undefined, keys: new Set() });
    return { ...block, data: Buffer.from(JSON.stringify(anonymized), 'utf8').toString('base64') };
  }

  /** Anonymizes one Automerge document, writing it as a single change by a deterministic actor. */
  documentBytes(documentId: string, bytes: Uint8Array, time = 0): Uint8Array {
    if (bytes.byteLength === 0) {
      return bytes;
    }
    const plain = this.document(Automerge.load<Record<string, unknown>>(bytes));
    const actor = hash(`actor:${documentId}`, this.#seed).toString(16).padStart(14, '0').padEnd(32, '0');
    const doc = Automerge.change(Automerge.init<Record<string, unknown>>({ actor }), { time }, (draft) => {
      Object.assign(draft, plain);
    });
    return Automerge.save(doc);
  }

  #entity(entity: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(entity).map(([key, value]) => {
        this.#keep(key);
        if (key === 'system') {
          return [key, this.#copy(value)];
        }
        if (key === 'meta' && isRecord(value)) {
          return [key, this.#meta(value)];
        }
        return [key, this.#value(value, { key, keys: collectKeys(value) })];
      }),
    );
  }

  /** Meta holds tags, annotations and versions (structural) plus foreign keys, whose ids are external content. */
  #meta(meta: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(meta).map(([key, value]) => {
        this.#keep(key);
        if (key === 'keys' || key === 'key') {
          return [key, this.#value(value, { key, keys: new Set() })];
        }
        return [key, this.#copy(value)];
      }),
    );
  }

  #value(value: unknown, context: Context): unknown {
    if (typeof value === 'string') {
      return this.#string(value, context);
    }
    if (typeof value === 'number') {
      return this.#number(value, context);
    }
    if (value instanceof Automerge.ImmutableString) {
      return new Automerge.ImmutableString(this.#string(value.val, context));
    }
    if (value instanceof Automerge.Counter) {
      return new Automerge.Counter(this.#number(value.value, context));
    }
    if (value instanceof Uint8Array) {
      return this.#bytes(value);
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.#value(item, context));
    }
    if (isRecord(value)) {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => {
          this.#keep(key);
          return [key, this.#value(item, { key, keys: context.keys })];
        }),
      );
    }
    return this.#copy(value);
  }

  #copy(value: unknown): unknown {
    return copy(value, this.#keep);
  }

  #string(value: string, { key, keys }: Context): string {
    if (
      (key !== undefined && VERBATIM_STRING_KEYS.has(key)) ||
      (key !== undefined && ENUM_KEYS.has(key) && IDENTIFIER_SHAPED.test(value)) ||
      classifyString(value) === 'structural' ||
      keys.has(value)
    ) {
      this.#keep(value);
      return value;
    }
    return value.replace(WORD, (token) => this.#token(token));
  }

  #number(value: number, { key }: Context): number {
    if (!Number.isFinite(value) || value === 0 || (key !== undefined && KEEP_NUMBER_KEYS.has(key))) {
      return value;
    }
    const magnitude = Math.abs(value);
    if (Number.isInteger(value) && magnitude >= EPOCH_MS_MIN && magnitude < EPOCH_MS_MAX) {
      return value;
    }
    const text = String(magnitude);
    const match = /^(\d+)(?:\.(\d+))?(e[+-]?\d+)?$/.exec(text);
    if (!match || (Number.isInteger(value) && !Number.isSafeInteger(value))) {
      return value;
    }
    const [, integerPart, fractionPart, exponent = ''] = match;
    const integer = this.#token(integerPart);
    // A fraction ending in zero would print shorter and could turn the number into an integer.
    const fraction = fractionPart === undefined ? '' : `.${this.#token(fractionPart).replace(/0$/, '1')}`;
    return Math.sign(value) * Number(`${integer}${fraction}${exponent}`);
  }

  #bytes(value: Uint8Array): Uint8Array {
    const next = generator(hash(`bytes:${value.byteLength}`, this.#seed));
    return Uint8Array.from(value, () => next(256));
  }

  #token(token: string): string {
    const existing = this.#tokens.get(token);
    if (existing !== undefined) {
      return existing;
    }
    let output = token;
    if (!KEEP_TOKENS.has(token.toLowerCase()) && !ULID.test(token) && !SPACE_ID.test(token)) {
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        output = generate(token, generator(hash(`${attempt}:${token}`, this.#seed)));
        // Distinct inputs keep distinct outputs so uniqueness (ids, foreign keys) survives; short runs may collide.
        if (!this.#outputs.has(output) && (output !== token || token.length < 3)) {
          break;
        }
      }
    }
    this.#tokens.set(token, output);
    this.#outputs.add(output);
    return output;
  }
}

/** Generates a replacement run of the same length and character classes. */
const generate = (token: string, next: (bound: number) => number): string => {
  const characters = [...token];
  if (/^\d+$/.test(token)) {
    return characters
      .map((character, index) => (index > 0 ? DIGITS[next(10)] : character === '0' ? '0' : DIGITS[1 + next(9)]))
      .join('');
  }
  if (/^\p{L}+$/u.test(token)) {
    const startWithVowel = next(2) === 0;
    return characters
      .map((character, index) => {
        const pool = (index % 2 === 0) === startWithVowel ? VOWELS : CONSONANTS;
        const letter = pool[next(pool.length)];
        return character !== character.toLowerCase() ? letter.toUpperCase() : letter;
      })
      .join('');
  }
  const hex = /^[0-9a-f]+$/.test(token) ? 'abcdef' : /^[0-9A-F]+$/.test(token) ? 'ABCDEF' : undefined;
  return characters
    .map((character) => {
      if (/\d/.test(character)) {
        return DIGITS[next(10)];
      }
      if (hex !== undefined) {
        return hex[next(hex.length)];
      }
      const pool = character !== character.toLowerCase() ? UPPER : LOWER;
      return pool[next(pool.length)];
    })
    .join('');
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  !(value instanceof Uint8Array) &&
  !(value instanceof Date) &&
  !(value instanceof Automerge.ImmutableString) &&
  !(value instanceof Automerge.Counter);

const mapRecord = (record: Record<string, unknown>, map: (value: unknown) => unknown): Record<string, unknown> =>
  Object.fromEntries(Object.entries(record).map(([key, value]) => [key, map(value)]));

/** Clones a value out of an Automerge proxy, keeping raw strings, counters, dates and bytes as their own types. */
const copy = (value: unknown, onString?: (value: string) => void): unknown => {
  if (typeof value === 'string') {
    onString?.(value);
    return value;
  }
  if (value instanceof Automerge.ImmutableString) {
    onString?.(value.val);
    return new Automerge.ImmutableString(value.val);
  }
  if (value instanceof Automerge.Counter) {
    return new Automerge.Counter(value.value);
  }
  if (value instanceof Date) {
    return new Date(value.getTime());
  }
  if (value instanceof Uint8Array) {
    return new Uint8Array(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => copy(item, onString));
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => {
        onString?.(key);
        return [key, copy(item, onString)];
      }),
    );
  }
  return value;
};

const collectKeys = (value: unknown, keys = new Set<string>()): Set<string> => {
  if (Array.isArray(value)) {
    value.forEach((item) => collectKeys(item, keys));
  } else if (isRecord(value)) {
    for (const [key, item] of Object.entries(value)) {
      keys.add(key);
      collectKeys(item, keys);
    }
  }
  return keys;
};

/** One file of a space archive. */
export type ArchiveFile = {
  path: string;
  content: Uint8Array;
};

/**
 * Anonymizes the files of a space archive (see `SpaceArchiveFileStructure`), keeping paths and order.
 * Files outside the known layout are dropped, since their content cannot be checked.
 */
export const anonymizeSpaceArchiveFiles = (anonymizer: Anonymizer, files: ArchiveFile[]): ArchiveFile[] => {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const metadataFile = files.find((file) => file.path === SpaceArchiveFileStructure.metadata);
  const metadata: SpaceArchiveMetadata | undefined = metadataFile
    ? JSON.parse(decoder.decode(metadataFile.content))
    : undefined;
  const time = Math.floor((metadata?.createdAt ?? 0) / 1000);
  const documentsPrefix = `${SpaceArchiveFileStructure.documents}/`;
  const feedsPrefix = `${SpaceArchiveFileStructure.feeds}/`;

  return files.flatMap((file): ArchiveFile[] => {
    if (file.path === SpaceArchiveFileStructure.metadata && metadata) {
      // The exporter's DID names a real identity; it stays out of `keep` so the residue scan still checks it.
      const { exportedBy, ...structural } = metadata;
      const anonymized = {
        ...anonymizer.keep(structural),
        ...(exportedBy && { exportedBy: anonymizer.string(exportedBy) }),
      };
      return [{ path: file.path, content: encoder.encode(JSON.stringify(anonymized)) }];
    }
    if (file.path.startsWith(documentsPrefix) && file.path.endsWith('.bin')) {
      const documentId = file.path.slice(documentsPrefix.length, -'.bin'.length);
      return [{ path: file.path, content: anonymizer.documentBytes(documentId, file.content, time) }];
    }
    if (file.path.startsWith(feedsPrefix)) {
      const fileName = file.path.split('/').at(-1) ?? '';
      if (fileName === SpaceArchiveFileStructure.feedMetadata) {
        anonymizer.keep(JSON.parse(decoder.decode(file.content)));
        return [file];
      }
      if (fileName.startsWith(SpaceArchiveFileStructure.feedBlocksPrefix) && fileName.endsWith('.json')) {
        const blocks: FeedArchiveBlock[] = JSON.parse(decoder.decode(file.content));
        const anonymized = blocks.map((block) => anonymizer.feedBlock(block));
        return [{ path: file.path, content: encoder.encode(JSON.stringify(anonymized)) }];
      }
    }
    return [];
  });
};

/** A secret-like pattern found in anonymized output. */
export type SecretFinding = {
  pattern: string;
  /** Redacted sample: first and last characters only. */
  sample: string;
};

const SECRET_PATTERNS: Record<string, RegExp> = {
  anthropicKey: /sk-ant-[\w-]{10,}/g,
  openaiKey: /\bsk-[\w-]{20,}/g,
  githubToken: /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[\w]{20,})/g,
  slackToken: /\bxox[abposr]-[\w-]{10,}/g,
  awsAccessKey: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,
  googleApiKey: /\bAIza[\w-]{30,}/g,
  jwt: /\beyJ[\w-]{10,}\.eyJ[\w-]{10,}\.[\w-]{10,}/g,
  privateKey: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g,
  bearer: /\bBearer\s+[\w.~+/-]{16,}/gi,
  longHex: /\b[0-9a-f]{40,}\b/gi,
  longBase64: /(?<![\w+/])[A-Za-z0-9+/_-]{48,}={0,2}(?![\w+/])/g,
  email: /\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b/g,
};

/** Scans text for secret-like patterns; callers decide which findings are expected (e.g. Automerge heads). */
export const scanForSecrets = (text: string): SecretFinding[] =>
  Object.entries(SECRET_PATTERNS).flatMap(([pattern, regex]) =>
    [...text.matchAll(regex)].map(([match]) => ({
      pattern,
      sample: match.length <= 8 ? '*'.repeat(match.length) : `${match.slice(0, 4)}\u2026${match.slice(-2)}`,
    })),
  );
