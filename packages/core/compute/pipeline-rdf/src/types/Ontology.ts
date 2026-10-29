//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { DataFactory, type Literal, type NamedNode, type Quad } from 'n3';

import * as Predicate from './Predicate.ts';
import * as Vocab from './Vocab.ts';

const { quad, namedNode, literal } = DataFactory;

/**
 * A predicate the brain knows: its IRI, the shorthand rules use, the surface forms that map onto it, and the RDFS /
 * OWL / SKOS metadata it is described with in the ontology graph.
 */
export type Entry = {
  readonly iri: string;
  /** Lowercase identifier rules may use as shorthand (`works_on(dima, X)`); `sx:shorthand`. */
  readonly name: string;
  /** `rdfs:label`. */
  readonly label: string;
  /** Other surface forms that name it; `skos:altLabel`. */
  readonly synonyms?: ReadonlyArray<string>;
  /** `rdfs:comment`. */
  readonly description?: string;
  /** IRI of the class the subject belongs to; `rdfs:domain`. */
  readonly domain?: string;
  /** IRI of the class the object belongs to; `rdfs:range`. */
  readonly range?: string;
  /** IRI of the predicate that states the same relation in the other direction; `owl:inverseOf`. */
  readonly inverse?: string;
  /**
   * IRIs of predicates that mean the same; `owl:equivalentProperty`. A query for this predicate matches statements
   * made with any of them, which is how predicates are merged without rewriting stored statements.
   */
  readonly equivalents?: ReadonlyArray<string>;
  /** The vocabulary that defines it (`https://schema.org/`, a brain namespace); `rdfs:isDefinedBy`. */
  readonly definedBy?: string;
  /** When an extractor minted it; `dcterms:created`. */
  readonly created?: string;
  /** What minted it (an extractor id and model); `dcterms:creator`. */
  readonly creator?: string;
  /** A quote it was minted from; `skos:example`. */
  readonly example?: string;
  /** The predicate it was merged into; `dcterms:isReplacedBy`, with `owl:deprecated true`. */
  readonly replacedBy?: string;
};

/**
 * The lookup key for a surface predicate: pipeline-rdf's relation key (case, auxiliaries and head-verb
 * inflection collapse) with words joined by `_`, so `Will-Work-On`, `working on` and `works_on` compare equal.
 */
export const key = (surface: string): string =>
  Predicate.normalize(surface.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ')).replace(/\s+/g, '_');

const camel = (name: string): string => name.replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase());

/** The IRI a predicate shorthand mints to in a namespace, e.g. `works_on` -> `dx:worksOn`. */
export const iriFor = (name: string, namespace: string = Vocab.DX): string => `${namespace}${camel(name)}`;

/** An entry for a predicate shorthand; the IRI defaults to the `dx:` vocabulary. */
export const entry = (
  name: string,
  options: Omit<Entry, 'iri' | 'name' | 'label'> & { iri?: string; label?: string } = {},
): Entry => ({
  ...options,
  iri: options.iri ?? iriFor(name),
  name,
  label: options.label ?? name.replace(/_/g, ' '),
  definedBy: options.definedBy ?? (options.iri === undefined ? Vocab.DX : undefined),
});

export type OntologyOptions = {
  /** Where predicates the ontology does not know are minted: the brain's own namespace. */
  readonly namespace?: string;
};

/**
 * An extensible set of predicates. A surface form the ontology does not know mints a predicate in the ontology's
 * namespace (its brain's) from its relation key, so two documents that phrase a relation the same way still share
 * one predicate, and a predicate one brain invented never poses as a shared vocabulary term.
 */
export class Ontology {
  readonly entries: ReadonlyArray<Entry>;
  readonly namespace: string;
  readonly #byKey = new Map<string, Entry>();
  readonly #byIri = new Map<string, Entry>();

  /** @throws Error when two entries claim one surface form or one IRI. */
  constructor(entries: ReadonlyArray<Entry>, { namespace = Vocab.LOCAL_BRAIN }: OntologyOptions = {}) {
    this.entries = entries;
    this.namespace = namespace;
    for (const entry of entries) {
      if (this.#byIri.has(entry.iri)) {
        throw new Error(`Predicate defined twice: ${entry.iri}`);
      }
      this.#byIri.set(entry.iri, entry);
    }
    // Equivalents resolve to the entry naming them, unless an entry of their own defines them.
    for (const entry of entries) {
      for (const equivalent of entry.equivalents ?? []) {
        if (!this.#byIri.has(equivalent)) {
          this.#byIri.set(equivalent, entry);
        }
      }
    }
    for (const entry of entries) {
      // A merged-away predicate keeps its IRI readable but no longer claims surface forms.
      if (entry.replacedBy !== undefined) {
        continue;
      }
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

  /** The entry for an IRI (its own, or one it is equivalent to), if the ontology defines it. */
  get(iri: string): Entry | undefined {
    return this.#byIri.get(iri);
  }

  /** The entry an IRI stands for: a merged-away predicate's survivor, else its own entry. */
  canonical(iri: string): Entry | undefined {
    let entry = this.get(iri);
    const seen = new Set<string>();
    while (entry?.replacedBy !== undefined && !seen.has(entry.iri)) {
      seen.add(entry.iri);
      entry = this.get(entry.replacedBy) ?? entry;
    }
    return entry;
  }

  /** The IRIs a query for this predicate matches: its own and every equivalent, either way round. */
  equivalents(iri: string): Set<string> {
    const entry = this.canonical(iri);
    const iris = new Set([iri]);
    if (entry) {
      iris.add(entry.iri);
      for (const equivalent of entry.equivalents ?? []) {
        iris.add(equivalent);
      }
      for (const other of this.entries) {
        if (other.replacedBy === entry.iri) {
          iris.add(other.iri);
        }
      }
    }
    return iris;
  }

  /** The entry for a surface form; one the ontology does not know is minted in its namespace, labelled with the form. */
  resolve(surface: string): Entry {
    const known = this.find(surface);
    if (known) {
      return known;
    }
    const name = key(surface);
    return { iri: iriFor(name, this.namespace), name, label: surface.trim(), definedBy: this.namespace };
  }

  /** A new ontology with these entries added; an entry for a known IRI replaces it. */
  extend(entries: ReadonlyArray<Entry>): Ontology {
    const iris = new Set(entries.map(({ iri }) => iri));
    return new Ontology([...this.entries.filter(({ iri }) => !iris.has(iri)), ...entries], {
      namespace: this.namespace,
    });
  }

  /**
   * A new ontology with the predicates a brain has learned added: unlike {@link extend}, an entry this ontology
   * already defines, or whose surface form it already maps, is skipped rather than rejected, since a store may hold
   * predicates minted before the seed vocabulary named them.
   */
  include(entries: ReadonlyArray<Entry>): Ontology {
    const learned: Entry[] = [];
    const surfaces = new Set<string>();
    for (const entry of entries) {
      const forms = [entry.name, entry.label, ...(entry.synonyms ?? [])].map(key);
      if (this.get(entry.iri) || forms.some((form) => this.#byKey.has(form) || surfaces.has(form))) {
        continue;
      }
      forms.forEach((form) => surfaces.add(form));
      learned.push(entry);
    }
    return learned.length === 0 ? this : this.extend(learned);
  }

  /** The same predicates, minting new ones in another namespace. */
  withNamespace(namespace: string): Ontology {
    return new Ontology(this.entries, { namespace });
  }

  /**
   * Merges one predicate into another: the survivor gains the other's IRI as an equivalent and its surface forms as
   * synonyms, and the other is kept, deprecated, so stored statements made with it still read and match.
   * @throws Error when either IRI is not an entry of this ontology.
   */
  merge(from: string, into: string): Ontology {
    const source = this.entries.find(({ iri }) => iri === from);
    const target = this.entries.find(({ iri }) => iri === into);
    if (!source || !target) {
      throw new Error(`Cannot merge ${from} into ${into}: both must be defined.`);
    }
    const forms = new Set([target.name, target.label, ...(target.synonyms ?? [])].map(key));
    const merged: Entry = {
      ...target,
      synonyms: [
        ...(target.synonyms ?? []),
        ...[source.name, source.label, ...(source.synonyms ?? [])].filter((form) => !forms.has(key(form))),
      ].filter((form, index, all) => all.findIndex((other) => key(other) === key(form)) === index),
      equivalents: [...new Set([...(target.equivalents ?? []), source.iri, ...(source.equivalents ?? [])])],
    };
    const deprecated: Entry = { ...source, synonyms: [], equivalents: [], replacedBy: into };
    return new Ontology(
      this.entries.map((entry) => (entry.iri === into ? merged : entry.iri === from ? deprecated : entry)),
      { namespace: this.namespace },
    );
  }
}

/** Creates an ontology. */
export const make = (entries: ReadonlyArray<Entry>, options?: OntologyOptions): Ontology =>
  new Ontology(entries, options);

/** The label an IRI reads as when no ontology defines it: its local name, split into words. */
export const labelFromIri = (iri: string): string =>
  iri
    .replace(/^.*[#/]/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase();

//
// The ontology graph: every predicate is an `rdf:Property` described with RDFS, OWL, SKOS and DCMI terms, in a
// graph of its own (`Vocab.ONTOLOGY_GRAPH`) so the vocabulary is never mixed into the statements that use it.
//

const ontologyGraph = () => namedNode(Vocab.ONTOLOGY_GRAPH);

/** The entry as quads in the ontology graph. */
export const toQuads = (entry: Entry): Quad[] => {
  const subject = namedNode(entry.iri);
  const quads: Quad[] = [];
  const add = (predicate: string, object: NamedNode | Literal) =>
    quads.push(quad(subject, namedNode(predicate), object, ontologyGraph()));
  add(Vocab.RDF_TYPE, namedNode(Vocab.RDF_PROPERTY));
  add(Vocab.RDFS_LABEL, literal(entry.label));
  add(Vocab.SX_SHORTHAND, literal(entry.name));
  for (const synonym of entry.synonyms ?? []) {
    add(Vocab.SKOS_ALT_LABEL, literal(synonym));
  }
  const iris: ReadonlyArray<[string, string | undefined]> = [
    [Vocab.RDFS_DOMAIN, entry.domain],
    [Vocab.RDFS_RANGE, entry.range],
    [Vocab.OWL_INVERSE_OF, entry.inverse],
    [Vocab.RDFS_IS_DEFINED_BY, entry.definedBy],
    [Vocab.DCTERMS_IS_REPLACED_BY, entry.replacedBy],
  ];
  for (const [predicate, value] of iris) {
    if (value !== undefined) {
      add(predicate, namedNode(value));
    }
  }
  for (const equivalent of entry.equivalents ?? []) {
    add(Vocab.OWL_EQUIVALENT_PROPERTY, namedNode(equivalent));
  }
  const literals: ReadonlyArray<[string, string | undefined]> = [
    [Vocab.RDFS_COMMENT, entry.description],
    [Vocab.DCTERMS_CREATED, entry.created],
    [Vocab.DCTERMS_CREATOR, entry.creator],
    [Vocab.SKOS_EXAMPLE, entry.example],
  ];
  for (const [predicate, value] of literals) {
    if (value !== undefined) {
      add(predicate, literal(value));
    }
  }
  if (entry.replacedBy !== undefined) {
    add(Vocab.OWL_DEPRECATED, literal('true', namedNode(`${Vocab.XSD}boolean`)));
  }
  return quads;
};

/**
 * The entries described in the ontology graph, one per subject; the inverse of {@link toQuads}. A predicate known
 * only by its label (as facts store a minted one) reads with the shorthand its label keys to. Multi-valued fields
 * keep their first value where an entry holds one value.
 */
export const fromQuads = (quads: readonly Quad[]): Entry[] => {
  const subjects = new Map<string, Map<string, string[]>>();
  for (const entry of quads) {
    if (entry.graph.value !== Vocab.ONTOLOGY_GRAPH || entry.subject.termType !== 'NamedNode') {
      continue;
    }
    let props = subjects.get(entry.subject.value);
    if (!props) {
      subjects.set(entry.subject.value, (props = new Map()));
    }
    const values = props.get(entry.predicate.value) ?? [];
    if (!values.includes(entry.object.value)) {
      props.set(entry.predicate.value, [...values, entry.object.value]);
    }
  }
  return [...subjects].flatMap(([iri, props]) => {
    const one = (predicate: string) => props.get(predicate)?.[0];
    const many = (predicate: string) => props.get(predicate) ?? [];
    const label = one(Vocab.RDFS_LABEL) ?? labelFromIri(iri);
    const optional = {
      synonyms: many(Vocab.SKOS_ALT_LABEL),
      equivalents: many(Vocab.OWL_EQUIVALENT_PROPERTY),
      description: one(Vocab.RDFS_COMMENT),
      domain: one(Vocab.RDFS_DOMAIN),
      range: one(Vocab.RDFS_RANGE),
      inverse: one(Vocab.OWL_INVERSE_OF),
      definedBy: one(Vocab.RDFS_IS_DEFINED_BY),
      created: one(Vocab.DCTERMS_CREATED),
      creator: one(Vocab.DCTERMS_CREATOR),
      example: one(Vocab.SKOS_EXAMPLE),
      replacedBy: one(Vocab.DCTERMS_IS_REPLACED_BY),
    };
    return [
      {
        iri,
        name: one(Vocab.SX_SHORTHAND) ?? key(label),
        label,
        ...Object.fromEntries(
          Object.entries(optional).filter(([, value]) =>
            Array.isArray(value) ? value.length > 0 : value !== undefined,
          ),
        ),
      },
    ];
  });
};

/** Every entry of the ontology as quads in the ontology graph. */
export const ontologyQuads = (ontology: Ontology): Quad[] => ontology.entries.flatMap(toQuads);

//
// The seed vocabulary. A predicate an established vocabulary defines is used under that vocabulary's own IRI, so
// the brain's graph reads as schema.org / FOAF / Dublin Core to any RDF tool; `dx:` holds only the relations no
// such vocabulary has (an agent's memories and actions). Each seed lists the `dx:` IRI it was stored under before
// it moved to the external one as an equivalent, so earlier statements still match.
//

const schema = (name: string) => `${Vocab.SCHEMA}${name}`;
const dx = (name: string) => `${Vocab.DX}${name}`;

const PERSON = schema('Person');
const ORGANIZATION = schema('Organization');
const PLACE = schema('Place');

/** The starter predicates: people and organizations, plus the relations agent goals are written against. */
export const DEFAULT_ENTRIES: ReadonlyArray<Entry> = [
  // RDF / RDFS: class membership.
  entry('is_a', {
    iri: Vocab.RDF_TYPE,
    label: 'is a',
    synonyms: ['is an', 'is instance of'],
    description: 'A class the subject is an instance of: "Socrates is a man".',
    definedBy: Vocab.RDF,
    equivalents: [dx('isA')],
  }),
  entry('kind_of', {
    iri: `${Vocab.RDFS}subClassOf`,
    label: 'kind of',
    synonyms: ['is kind of', 'is type of', 'is a type of', 'subclass of'],
    description:
      'A broader class every instance of the subject class belongs to: "a philosopher is a kind of thinker".',
    definedBy: Vocab.RDFS,
  }),
  entry('same_as', {
    iri: Vocab.OWL_SAME_AS,
    label: 'same as',
    synonyms: ['also known as', 'aka', 'is the same as'],
    description: 'The subject and object are one and the same entity.',
    definedBy: Vocab.OWL,
  }),

  // schema.org: people and organizations.
  entry('has_role', {
    iri: schema('jobTitle'),
    label: 'has role',
    synonyms: ['works as', 'is on the team as', 'role', 'job title'],
    description: 'The role or job title the subject holds.',
    domain: PERSON,
    definedBy: Vocab.SCHEMA,
    equivalents: [dx('hasRole')],
  }),
  entry('member_of', {
    iri: schema('memberOf'),
    synonyms: ['belongs to', 'is member of', 'is on the team', 'is on team'],
    description: 'The organization or team the subject belongs to.',
    domain: PERSON,
    range: ORGANIZATION,
    inverse: schema('member'),
    definedBy: Vocab.SCHEMA,
    equivalents: [dx('memberOf'), `${Vocab.ORG}memberOf`],
  }),
  entry('has_member', {
    iri: schema('member'),
    description: 'A member of the organization or team.',
    domain: ORGANIZATION,
    range: PERSON,
    inverse: schema('memberOf'),
    definedBy: Vocab.SCHEMA,
    equivalents: [dx('hasMember'), `${Vocab.ORG}hasMember`],
  }),
  entry('works_for', {
    iri: schema('worksFor'),
    synonyms: ['works at', 'employed by', 'is employed at'],
    description: 'The organization that employs the subject.',
    domain: PERSON,
    range: ORGANIZATION,
    definedBy: Vocab.SCHEMA,
  }),
  entry('founded', {
    synonyms: ['is founder of', 'established', 'started'],
    description: 'An organization the subject founded; schema.org states it the other way round (`schema:founder`).',
    domain: PERSON,
    range: ORGANIZATION,
    inverse: schema('founder'),
  }),
  entry('alumni_of', {
    iri: schema('alumniOf'),
    label: 'alumni of',
    synonyms: ['studied at', 'graduated from'],
    description: 'A school or organization (never a person) the subject studied at or was formerly part of.',
    domain: PERSON,
    range: ORGANIZATION,
    definedBy: Vocab.SCHEMA,
  }),
  entry('knows_about', {
    iri: schema('knowsAbout'),
    synonyms: ['is expert in', 'is the one to ask about', 'expert in', 'specializes in'],
    description: 'An area the subject can answer questions about.',
    definedBy: Vocab.SCHEMA,
    equivalents: [dx('knowsAbout')],
  }),
  entry('located_in', {
    iri: schema('location'),
    synonyms: ['lives in', 'is based in', 'based in', 'is located in'],
    description: 'Where the subject is.',
    range: PLACE,
    definedBy: Vocab.SCHEMA,
    equivalents: [dx('locatedIn')],
  }),
  entry('born_in', {
    iri: schema('birthPlace'),
    synonyms: ['was born in', 'birthplace'],
    description: 'The place the subject was born.',
    domain: PERSON,
    range: PLACE,
    definedBy: Vocab.SCHEMA,
  }),
  entry('about', {
    iri: schema('about'),
    synonyms: ['is about', 'concerns', 'covers'],
    description: 'The topic a document, message or event is about.',
    definedBy: Vocab.SCHEMA,
  }),
  entry('mentions', {
    iri: schema('mentions'),
    synonyms: ['refers to', 'cites'],
    description: 'An entity a document or message mentions without being about it.',
    definedBy: Vocab.SCHEMA,
  }),

  // FOAF: social relations and accounts.
  entry('knows', {
    iri: `${Vocab.FOAF}knows`,
    synonyms: ['is friends with', 'is acquainted with', 'met'],
    description: 'A person the subject knows.',
    domain: PERSON,
    range: PERSON,
    definedBy: Vocab.FOAF,
    equivalents: [schema('knows')],
  }),
  entry('has_account', {
    iri: `${Vocab.FOAF}account`,
    synonyms: ['is on discord as', 'username', 'handle'],
    description: 'An account the subject uses, such as a Discord username.',
    definedBy: Vocab.FOAF,
    equivalents: [dx('hasAccount')],
  }),

  // Dublin Core: works and their parts.
  entry('created_by', {
    iri: `${Vocab.DCTERMS}creator`,
    synonyms: ['authored by', 'written by', 'made by'],
    description: 'Who made the subject (a document, a project, a thing).',
    range: PERSON,
    definedBy: Vocab.DCTERMS,
  }),
  entry('part_of', {
    iri: `${Vocab.DCTERMS}isPartOf`,
    synonyms: ['is part of', 'component of'],
    description: 'A larger whole the subject is part of.',
    definedBy: Vocab.DCTERMS,
  }),
  entry('depends_on', {
    iri: `${Vocab.DCTERMS}requires`,
    synonyms: ['requires', 'needs'],
    description: 'Something the subject cannot work or happen without.',
    definedBy: Vocab.DCTERMS,
  }),
  entry('related_to', {
    iri: `${Vocab.SKOS}related`,
    synonyms: ['is related to', 'is associated with'],
    description: 'An associative link when no more specific predicate fits.',
    definedBy: Vocab.SKOS,
  }),

  // dx: what an agent records and does, which no shared vocabulary names.
  entry('claim', { description: "A remembered statement about the subject, in the agent's words." }),
  entry('has_note', { label: 'has note', description: 'Notes about the subject, in markdown.' }),
  entry('helps_with', { synonyms: ['will help with', 'helping with'], description: 'Work the subject helps with.' }),
  entry('works_on', {
    synonyms: ['working on', 'will work on'],
    description: 'A project or task the subject is working on.',
  }),
  entry('completed', { synonyms: ['finished', 'done'], description: 'A task the subject finished.' }),
  entry('shipped', { synonyms: ['ships', 'released'], description: 'Something the subject released.' }),
  entry('proposes', { synonyms: ['suggests'], description: 'An idea or change the subject put forward.' }),
  entry('received', { description: 'Something the subject was sent.' }),
  entry('archived', { description: 'Something the subject archived.' }),
  entry('deleted', { description: 'Something the subject deleted.' }),
  entry('filed', { description: 'Something the subject filed (an issue, a report).' }),
  entry('drafted', { description: 'Something the subject drafted.' }),
  entry('notified', { description: 'Someone the subject notified.' }),
  entry('relayed', { description: 'A message the subject passed on.' }),
  entry('awaiting', { synonyms: ['waiting for'], description: 'Something the subject is waiting for.' }),
];

/** The starter ontology. */
export const DEFAULT: Ontology = make(DEFAULT_ENTRIES);
