//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Stream from 'effect/Stream';

import type * as Agent from '@dxos/assistant/Agent';
import { Database, Filter, Obj } from '@dxos/echo';
import { Space } from '@dxos/halo';
import { type RDF } from '@dxos/pipeline-rdf';
import { Organization, Person } from '@dxos/types';

import { ChatParticipant } from '#types';

/** The id facts the agent states are attributed to: its DID once agents have one, else its object URI. */
export const agentId = (agent: Agent.Agent): string => agent.did ?? Obj.getURI(agent);

/** The identity DID a person object records for a space member, if any. */
export const personDid = (person: Obj.Unknown): string | undefined =>
  Obj.instanceOf(Person.Person, person)
    ? person.identities?.find((identity) => identity.label === ChatParticipant.IDENTITY_LABEL)?.value
    : undefined;

/** The space's current members, from HALO. */
export const loadMembers: Effect.Effect<readonly Space.Member[], never, Space.Service | Database.Service> = Effect.gen(
  function* () {
    const spaceId = yield* Database.spaceId;
    const current = yield* Space.members(spaceId).pipe(Stream.runHead);
    return Option.getOrElse(current, () => []);
  },
);

const nameKey = (name: string): string => name.trim().replace(/\s+/g, ' ').toLowerCase();

/** The members who go by a name: their display name, or its first word. */
const membersGoingBy = (members: readonly Space.Member[], name: string): Space.Member[] => {
  const key = nameKey(name);
  return members.filter(
    ({ did, displayName }) =>
      did !== undefined &&
      displayName !== undefined &&
      [nameKey(displayName), nameKey(displayName).split(' ')[0]].includes(key),
  );
};

/** How many members go by a name. */
export const membersNamed = (members: readonly Space.Member[], name: string): number =>
  membersGoingBy(members, name).length;

/** The member a name refers to, by display name or its first word; undefined when no one, or more than one, goes by it. */
export const memberByName = (members: readonly Space.Member[], name: string): Space.Member | undefined => {
  const matches = membersGoingBy(members, name);
  return matches.length === 1 ? matches[0] : undefined;
};

/** The member with the DID. */
export const memberByDid = (members: readonly Space.Member[], did: string): Space.Member | undefined =>
  members.find((member) => member.did === did);

/** A display name for an id facts and watches carry: the member's display name, else the id itself. */
export const labelOf =
  (members: readonly Space.Member[]) =>
  (id: string): string =>
    memberByDid(members, id)?.displayName ?? id;

/** A person or organization in the space, as a fact about it names it. */
export type KnownEntity = { readonly uri: string; readonly type: 'person' | 'org'; readonly name: string };

/** The space's people and organizations by each name they go by; a name two of them share is left out. */
export type EntityIndex = ReadonlyMap<string, KnownEntity>;

/** Indexes the space's people and organizations by name, so a fact naming one is keyed by its object's URI. */
export const loadEntities = Effect.gen(function* () {
  const people = yield* Database.query(Filter.type(Person.Person)).run;
  const organizations = yield* Database.query(Filter.type(Organization.Organization)).run;
  const byName = new Map<string, KnownEntity[]>();
  const add = (names: readonly (string | undefined)[], entity: Omit<KnownEntity, 'name'>) => {
    for (const name of names) {
      if (name && name.trim().length > 0) {
        byName.set(nameKey(name), [...(byName.get(nameKey(name)) ?? []), { ...entity, name: name.trim() }]);
      }
    }
  };
  for (const person of people) {
    add([person.fullName, person.preferredName, person.nickname], { uri: Obj.getURI(person), type: 'person' });
  }
  for (const organization of organizations) {
    add([organization.name], { uri: Obj.getURI(organization), type: 'org' });
  }
  const index = new Map<string, KnownEntity>();
  for (const [name, entities] of byName) {
    if (new Set(entities.map(({ uri }) => uri)).size === 1) {
      index.set(name, entities[0]);
    }
  }
  return index satisfies EntityIndex;
});

/**
 * A term naming a member is re-keyed to the member's DID, and one naming a person or organization in the space to
 * its object's URI; its surface form stays the label.
 */
const resolveTerm = (members: readonly Space.Member[], entities: EntityIndex, term: RDF.Term): RDF.Term => {
  if (term.kind !== 'entity') {
    return term;
  }
  const name = term.label ?? term.entity;
  const member = memberByName(members, name);
  if (member?.did) {
    return { ...term, entity: member.did, label: term.label ?? member.displayName, type: 'person' };
  }
  const known = entities.get(nameKey(name));
  return known ? { ...term, entity: known.uri, label: name, type: known.type } : term;
};

/**
 * The members, people and organizations the extractor is shown by name, so a mention of one is stored under its DID
 * or object URI rather than an IRI local to the graph mentioning it.
 */
export const knownEntities = (members: readonly Space.Member[], entities: EntityIndex): RDF.KnownEntity[] => {
  const byIri = new Map<string, { label: string; aliases: string[]; type: RDF.EntityKind }>();
  const add = (iri: string, name: string, type: RDF.EntityKind) => {
    const known = byIri.get(iri);
    if (!known) {
      byIri.set(iri, { label: name, aliases: [], type });
    } else if (
      nameKey(known.label) !== nameKey(name) &&
      !known.aliases.some((alias) => nameKey(alias) === nameKey(name))
    ) {
      known.aliases.push(name);
    }
  };
  for (const { did, displayName } of members) {
    if (did && displayName) {
      add(did, displayName, 'person');
    }
  }
  for (const { uri, name, type } of entities.values()) {
    add(uri, name, type);
  }
  return [...byIri].map(([iri, { label, aliases, type }]) => ({
    iri,
    label,
    type,
    ...(aliases.length > 0 ? { aliases } : {}),
  }));
};

/** Re-keys the fact's subject and object to the members, people and organizations they name. */
export const resolveTerms = (
  members: readonly Space.Member[],
  fact: RDF.Fact,
  entities: EntityIndex = new Map(),
): RDF.Fact => ({
  ...fact,
  assertion: {
    ...fact.assertion,
    subject: resolveTerm(members, entities, fact.assertion.subject),
    object: resolveTerm(members, entities, fact.assertion.object),
  },
});
