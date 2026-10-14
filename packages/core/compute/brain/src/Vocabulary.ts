//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Ontology, Predicate } from '@dxos/pipeline-rdf/types';

/** A canonical predicate and the surface forms extraction maps onto it. */
export type Entry = {
  /** Identifier usable as rule shorthand (`helps_with(dima, X)`). */
  readonly predicate: string;
  readonly synonyms?: ReadonlyArray<string>;
  readonly description?: string;
};

/**
 * The lookup key for a surface predicate: pipeline-rdf's relation key (case, auxiliaries and head-verb
 * inflection collapse, as the fact store matches them) with words joined by `_`, so `Will-Work-On`,
 * `working on` and `works_on` compare equal.
 */
export const normalize = (surface: string): string =>
  Predicate.normalize(surface.replace(/[_-]+/g, ' ')).replace(/\s+/g, '_');

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

/** Entries for an ontology's predicates, so rules use the same predicates the brain stores facts with. */
export const fromOntology = (ontology: Ontology.Ontology): ReadonlyArray<Entry> =>
  ontology.entries.map(({ name, label, synonyms = [], description }) => ({
    predicate: name,
    synonyms: [label, ...synonyms].filter((surface) => normalize(surface) !== normalize(name)),
    ...(description ? { description } : {}),
  }));

/** The starter vocabulary: pipeline-rdf's default ontology, which extraction grows. */
export const DEFAULT_ENTRIES: ReadonlyArray<Entry> = fromOntology(Ontology.DEFAULT);
