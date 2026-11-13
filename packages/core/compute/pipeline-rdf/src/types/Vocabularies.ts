//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Ontology from './Ontology.ts';
import * as Vocab from './Vocab.ts';

/**
 * A published vocabulary's predicates, under that vocabulary's own IRIs, as a pack an ontology can be seeded with. The
 * packs cover what conversations mostly state (people, organizations, work, discussion threads); each lists a curated
 * subset, since every predicate shown to the extractor costs prompt tokens.
 */
export type Pack = {
  /** Short id a configuration names the pack by (`schema`, `foaf`). */
  readonly id: string;
  readonly label: string;
  /** The vocabulary's namespace IRI; `rdfs:isDefinedBy` of every entry. */
  readonly namespace: string;
  readonly entries: ReadonlyArray<Ontology.Entry>;
};

type Term = Omit<Ontology.Entry, 'iri' | 'name' | 'label' | 'definedBy'> & { readonly label?: string };

const pack = (id: string, label: string, namespace: string, terms: Record<string, [local: string, Term]>): Pack => ({
  id,
  label,
  namespace,
  entries: Object.entries(terms).map(([name, [local, term]]) =>
    Ontology.entry(name, { ...term, iri: `${namespace}${local}`, definedBy: namespace }),
  ),
});

const schema = (name: string) => `${Vocab.SCHEMA}${name}`;
const foaf = (name: string) => `${Vocab.FOAF}${name}`;
const sioc = (name: string) => `${Vocab.SIOC}${name}`;
const org = (name: string) => `${Vocab.ORG}${name}`;

const PERSON = schema('Person');
const ORGANIZATION = schema('Organization');
const CREATIVE_WORK = schema('CreativeWork');
const EVENT = schema('Event');

/** schema.org beyond the seed: authorship, employment, organizational structure, events and software. */
export const SCHEMA: Pack = pack('schema', 'schema.org', Vocab.SCHEMA, {
  has_author: ['author', { label: 'has author', range: PERSON, domain: CREATIVE_WORK }],
  publisher: ['publisher', { synonyms: ['published by'], domain: CREATIVE_WORK }],
  employee: [
    'employee',
    { label: 'employs', synonyms: ['has employee', 'hired'], domain: ORGANIZATION, range: PERSON },
  ],
  colleague: ['colleague', { label: 'colleague of', synonyms: ['works with', 'is colleague of'], domain: PERSON }],
  parent_organization: [
    'parentOrganization',
    {
      label: 'parent organization',
      synonyms: ['is subsidiary of', 'owned by company'],
      domain: ORGANIZATION,
      range: ORGANIZATION,
    },
  ],
  sub_organization: [
    'subOrganization',
    {
      label: 'sub organization',
      synonyms: ['has subsidiary', 'has division'],
      domain: ORGANIZATION,
      range: ORGANIZATION,
    },
  ],
  affiliation: [
    'affiliation',
    { label: 'affiliated with', synonyms: ['is affiliated with'], domain: PERSON, range: ORGANIZATION },
  ],
  owns: ['owns', { synonyms: ['is owner of', 'possesses'] }],
  sponsor: ['sponsor', { label: 'sponsored by', synonyms: ['funded by', 'backed by'] }],
  attendee: ['attendee', { label: 'attended by', synonyms: ['has attendee'], domain: EVENT }],
  organizer: ['organizer', { label: 'organized by', synonyms: ['hosted by', 'run by'], domain: EVENT }],
  start_date: ['startDate', { label: 'starts on', synonyms: ['start date', 'begins on'] }],
  end_date: ['endDate', { label: 'ends on', synonyms: ['end date', 'deadline'] }],
  email: ['email', { label: 'has email', synonyms: ['email address'], domain: PERSON }],
  url: ['url', { label: 'has url', synonyms: ['website'] }],
  is_based_on: ['isBasedOn', { label: 'based on', synonyms: ['derived from', 'forked from'] }],
  citation: ['citation', { label: 'cites work', synonyms: ['references paper'] }],
  programming_language: [
    'programmingLanguage',
    { label: 'written in', synonyms: ['programming language', 'implemented in'] },
  ],
  software_version: ['softwareVersion', { label: 'at version', synonyms: ['software version', 'release'] }],
  knows_language: ['knowsLanguage', { label: 'speaks', synonyms: ['knows language'], domain: PERSON }],
  works_location: ['workLocation', { label: 'works in', synonyms: ['work location', 'office in'], domain: PERSON }],
  award: ['award', { label: 'won award', synonyms: ['received award', 'awarded'] }],
});

/** FOAF: people, their interests, projects and what they made. */
export const FOAF: Pack = pack('foaf', 'FOAF', Vocab.FOAF, {
  nick: ['nick', { label: 'nickname', synonyms: ['goes by', 'called', 'nicknamed'], domain: foaf('Person') }],
  homepage: ['homepage', { synonyms: ['home page'] }],
  interest: [
    'topic_interest',
    { label: 'interested in', synonyms: ['likes', 'is into', 'cares about'], domain: foaf('Person') },
  ],
  current_project: [
    'currentProject',
    { label: 'current project', synonyms: ['is building', 'is working on project'], domain: foaf('Person') },
  ],
  past_project: [
    'pastProject',
    { label: 'past project', synonyms: ['used to work on', 'former project'], domain: foaf('Person') },
  ],
  made: ['made', { synonyms: ['built', 'created', 'is maker of'] }],
  based_near: ['based_near', { label: 'based near', synonyms: ['near', 'lives near'] }],
  workplace_homepage: ['workplaceHomepage', { label: 'workplace homepage' }],
});

/** Dublin Core terms: documents, their subjects, versions and references. */
export const DCTERMS: Pack = pack('dcterms', 'Dublin Core', Vocab.DCTERMS, {
  subject: ['subject', { label: 'has subject', synonyms: ['is on the topic of', 'categorized as'] }],
  title: ['title', { label: 'titled', synonyms: ['has title', 'named'] }],
  contributor: ['contributor', { label: 'contributed to by', synonyms: ['has contributor'] }],
  references: ['references', { synonyms: ['points to', 'links'] }],
  replaces: ['replaces', { synonyms: ['supersedes', 'succeeds'] }],
  has_part: ['hasPart', { label: 'has part', synonyms: ['contains', 'includes'] }],
  has_version: ['hasVersion', { label: 'has variant', synonyms: ['variant of', 'edition of'] }],
  conforms_to: ['conformsTo', { label: 'conforms to', synonyms: ['complies with', 'implements spec'] }],
  license: ['license', { label: 'licensed under', synonyms: ['license'] }],
  language: ['language', { label: 'in language' }],
  modified: ['modified', { label: 'modified on', synonyms: ['updated on', 'last changed'] }],
});

/** W3C Organization Ontology: reporting lines, posts and units. */
export const ORG: Pack = pack('org', 'W3C Organization', Vocab.ORG, {
  head_of: [
    'headOf',
    { label: 'head of', synonyms: ['leads', 'runs', 'is head of', 'manages'], range: org('Organization') },
  ],
  reports_to: ['reportsTo', { label: 'reports to', synonyms: ['managed by', 'works under'] }],
  has_unit: ['hasUnit', { label: 'has unit', synonyms: ['has team', 'has department'] }],
  unit_of: ['unitOf', { label: 'unit of', synonyms: ['team of', 'department of'] }],
  has_site: ['hasSite', { label: 'has site', synonyms: ['has office', 'office at'] }],
  purpose: ['purpose', { label: 'has purpose', synonyms: ['mission', 'aims to'] }],
  resulted_from: ['resultedFrom', { label: 'resulted from', synonyms: ['formed by', 'came out of'] }],
});

/** SIOC: online-community structure, so chat threads read as posts, replies and channels. */
export const SIOC: Pack = pack('sioc', 'SIOC', Vocab.SIOC, {
  has_creator: ['has_creator', { label: 'posted by', synonyms: ['has creator', 'sent by'], domain: sioc('Post') }],
  reply_of: [
    'reply_of',
    { label: 'reply to', synonyms: ['replies to', 'responds to', 'answers'], domain: sioc('Post') },
  ],
  has_container: ['has_container', { label: 'posted in', synonyms: ['in channel', 'in thread'], domain: sioc('Item') }],
  container_of: ['container_of', { label: 'contains post', synonyms: ['channel of'] }],
  topic: ['topic', { label: 'has topic', synonyms: ['discusses', 'is discussing'] }],
  links_to: ['links_to', { label: 'links to', synonyms: ['shares link to', 'shared'] }],
  addressed_to: ['addressed_to', { label: 'addressed to', synonyms: ['directed at', 'pings', 'tags'] }],
  moderator_of: ['moderator_of', { label: 'moderator of', synonyms: ['moderates', 'admin of'] }],
  subscriber_of: ['subscriber_of', { label: 'subscribed to', synonyms: ['follows channel', 'watches'] }],
});

/** Every pack, in the order {@link compose} prefers them when two claim one surface form. */
export const ALL: ReadonlyArray<Pack> = [SCHEMA, FOAF, DCTERMS, ORG, SIOC];

/** The pack a configuration names, if any. */
export const get = (id: string): Pack | undefined => ALL.find((candidate) => candidate.id === id);

/**
 * An ontology seeded with these packs on top of `base` (the default seed). A pack predicate the ontology already
 * defines, or whose surface form an earlier one claims, is left out, so packs compose in any combination.
 */
export const compose = (packs: ReadonlyArray<Pack>, base: Ontology.Ontology = Ontology.DEFAULT): Ontology.Ontology =>
  base.include(packs.flatMap(({ entries }) => entries));

/**
 * The packs a comma-separated list of ids names (`schema,foaf,sioc`; `all` for every pack).
 * @throws Error naming an unknown id.
 */
export const parse = (ids: string): Pack[] => {
  const names = ids
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
  if (names.includes('all')) {
    return [...ALL];
  }
  return names.map((id) => {
    const found = get(id);
    if (!found) {
      throw new Error(`Unknown vocabulary "${id}"; known: ${ALL.map((candidate) => candidate.id).join(', ')}, all.`);
    }
    return found;
  });
};
