//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

/** A canonical predicate and the surface forms extraction maps onto it. */
export type Entry = {
  /** Identifier usable as rule shorthand (`helps_with(dima, X)`). */
  readonly predicate: string;
  readonly synonyms?: ReadonlyArray<string>;
  readonly description?: string;
};

/** Lowercases and joins words with `_`, so `Will-Work-On` and `will work on` compare equal. */
export const normalize = (surface: string): string =>
  surface
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

/** The canonical predicates rules may use as shorthand, and the synonyms that map onto them. */
export class Vocabulary {
  readonly entries: ReadonlyArray<Entry>;
  readonly #canonical = new Map<string, string>();
  readonly #predicates = new Set<string>();

  /** @throws Error on an invalid predicate name, a reserved name, or a synonym claimed twice. */
  constructor(entries: ReadonlyArray<Entry>, reserved: ReadonlyArray<string> = []) {
    this.entries = entries;
    for (const { predicate, synonyms = [] } of entries) {
      if (!/^[a-z][a-z0-9_]*$/.test(predicate)) {
        throw new Error(`Canonical predicate must be a lowercase identifier: ${predicate}`);
      }
      if (reserved.includes(predicate)) {
        throw new Error(`Canonical predicate collides with a reserved name: ${predicate}`);
      }
      this.#predicates.add(predicate);
      for (const surface of [predicate, ...synonyms]) {
        const key = normalize(surface);
        const existing = this.#canonical.get(key);
        if (existing !== undefined && existing !== predicate) {
          throw new Error(`Synonym ${surface} maps to both ${existing} and ${predicate}`);
        }
        this.#canonical.set(key, predicate);
      }
    }
  }

  /** True if `name` is a canonical predicate. */
  isCanonical(name: string): boolean {
    return this.#predicates.has(name);
  }

  /** The canonical predicate for a surface form, if the vocabulary knows it. */
  canonical(surface: string): string | undefined {
    return this.#canonical.get(normalize(surface));
  }

  /** The stored predicate for a surface form: canonical if known, otherwise the form unchanged. */
  resolve(surface: string): string {
    return this.canonical(surface) ?? surface;
  }
}

/** Creates a vocabulary. */
export const make = (entries: ReadonlyArray<Entry>, reserved: ReadonlyArray<string> = []): Vocabulary =>
  new Vocabulary(entries, reserved);

/** A starter vocabulary covering the example goals; extraction grows it. */
export const DEFAULT_ENTRIES: ReadonlyArray<Entry> = [
  { predicate: 'helps_with', synonyms: ['will-help-with', 'helping-with'] },
  { predicate: 'works_on', synonyms: ['working-on', 'will-work-on', 'working_on'] },
  { predicate: 'completed', synonyms: ['finished', 'done'] },
  { predicate: 'shipped', synonyms: ['ships', 'released'] },
  { predicate: 'proposes', synonyms: ['suggests'] },
  { predicate: 'received' },
  { predicate: 'archived' },
  { predicate: 'deleted' },
  { predicate: 'filed' },
  { predicate: 'drafted' },
  { predicate: 'notified' },
  { predicate: 'relayed' },
  { predicate: 'awaiting', synonyms: ['waiting-for'] },
];
