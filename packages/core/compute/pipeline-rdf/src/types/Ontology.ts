//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Predicate from './Predicate.ts';
import * as Vocab from './Vocab.ts';

/** A predicate the brain knows: its IRI, the shorthand rules use, and the surface forms that map onto it. */
export type Entry = {
  readonly iri: string;
  /** Lowercase identifier rules may use as shorthand (`works_on(dima, X)`). */
  readonly name: string;
  readonly label: string;
  readonly synonyms?: ReadonlyArray<string>;
  readonly description?: string;
  /** IRI of the class the subject belongs to. */
  readonly domain?: string;
  /** IRI of the class the object belongs to. */
  readonly range?: string;
  /** IRI of the predicate that states the same relation in the other direction. */
  readonly inverse?: string;
};

/**
 * The lookup key for a surface predicate: pipeline-rdf's relation key (case, auxiliaries and head-verb
 * inflection collapse) with words joined by `_`, so `Will-Work-On`, `working on` and `works_on` compare equal.
 */
export const key = (surface: string): string =>
  Predicate.normalize(surface.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ')).replace(/\s+/g, '_');

const camel = (name: string): string => name.replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase());

/** The IRI a predicate shorthand mints to, e.g. `works_on` → `dx:worksOn`. */
export const iriFor = (name: string): string => `${Vocab.DX}${camel(name)}`;

/** An entry for a predicate shorthand. */
export const entry = (
  name: string,
  options: Omit<Entry, 'iri' | 'name' | 'label'> & { label?: string } = {},
): Entry => ({
  iri: iriFor(name),
  name,
  label: options.label ?? name.replace(/_/g, ' '),
  ...options,
});

/**
 * An extensible set of predicates. A surface form the ontology does not know mints a predicate under `dx:` from
 * its relation key, so two documents that phrase a relation the same way still share one predicate.
 */
export class Ontology {
  readonly entries: ReadonlyArray<Entry>;
  readonly #byKey = new Map<string, Entry>();
  readonly #byIri = new Map<string, Entry>();

  /** @throws Error when two entries claim one surface form or one IRI. */
  constructor(entries: ReadonlyArray<Entry>) {
    this.entries = entries;
    for (const entry of entries) {
      if (this.#byIri.has(entry.iri)) {
        throw new Error(`Predicate defined twice: ${entry.iri}`);
      }
      this.#byIri.set(entry.iri, entry);
      for (const surface of [entry.name, entry.label, ...(entry.synonyms ?? [])]) {
        const existing = this.#byKey.get(key(surface));
        if (existing !== undefined && existing.iri !== entry.iri) {
          throw new Error(`Synonym ${surface} maps to both ${existing.name} and ${entry.name}`);
        }
        this.#byKey.set(key(surface), entry);
      }
    }
  }

  /** The entry a surface form names, if the ontology knows it. */
  find(surface: string): Entry | undefined {
    return this.#byKey.get(key(surface));
  }

  /** The entry for an IRI, if the ontology defines it. */
  get(iri: string): Entry | undefined {
    return this.#byIri.get(iri);
  }

  /** The entry for a surface form; one the ontology does not know is minted, labelled with the form itself. */
  resolve(surface: string): Entry {
    const known = this.find(surface);
    if (known) {
      return known;
    }
    const name = key(surface);
    return { iri: iriFor(name), name, label: surface.trim() };
  }

  /** A new ontology with these entries added; an entry for a known IRI replaces it. */
  extend(entries: ReadonlyArray<Entry>): Ontology {
    const iris = new Set(entries.map(({ iri }) => iri));
    return new Ontology([...this.entries.filter(({ iri }) => !iris.has(iri)), ...entries]);
  }
}

/** Creates an ontology. */
export const make = (entries: ReadonlyArray<Entry>): Ontology => new Ontology(entries);

/** The label an IRI reads as when no ontology defines it: its local name, split into words. */
export const labelFromIri = (iri: string): string =>
  iri
    .replace(/^.*[#/]/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase();

const PERSON = `${Vocab.DX}Person`;
const ORGANIZATION = `${Vocab.DX}Organization`;

/** The starter predicates: people and organizations, plus the relations agent goals are written against. */
export const DEFAULT_ENTRIES: ReadonlyArray<Entry> = [
  entry('has_role', {
    synonyms: ['works as', 'is on the team as', 'role', 'job title'],
    description: 'The role or job title the subject holds.',
    domain: PERSON,
    range: `${Vocab.DX}Role`,
  }),
  entry('member_of', {
    synonyms: ['belongs to', 'is member of', 'is on the team', 'is on team'],
    description: 'The organization or team the subject belongs to.',
    domain: PERSON,
    range: ORGANIZATION,
    inverse: iriFor('has_member'),
  }),
  entry('has_member', { description: 'A member of the organization or team.', domain: ORGANIZATION, range: PERSON }),
  entry('knows_about', {
    synonyms: ['knows', 'is expert in', 'is the one to ask about', 'expert in'],
    description: 'An area the subject can answer questions about.',
    domain: PERSON,
  }),
  entry('located_in', { synonyms: ['lives in', 'is based in', 'based in'], description: 'Where the subject is.' }),
  entry('has_account', {
    synonyms: ['is on discord as', 'username', 'handle'],
    description: 'An account the subject uses, such as a Discord username.',
  }),
  entry('is_a', { label: 'is a', synonyms: ['is kind of', 'is type of'], description: 'A class the subject is in.' }),
  entry('claim', { description: 'A remembered statement about the subject, in the agent’s words.' }),
  entry('helps_with', { synonyms: ['will help with', 'helping with'] }),
  entry('works_on', { synonyms: ['working on', 'will work on'] }),
  entry('completed', { synonyms: ['finished', 'done'] }),
  entry('shipped', { synonyms: ['ships', 'released'] }),
  entry('proposes', { synonyms: ['suggests'] }),
  entry('received'),
  entry('archived'),
  entry('deleted'),
  entry('filed'),
  entry('drafted'),
  entry('notified'),
  entry('relayed'),
  entry('awaiting', { synonyms: ['waiting for'] }),
];

/** The starter ontology. */
export const DEFAULT: Ontology = make(DEFAULT_ENTRIES);
