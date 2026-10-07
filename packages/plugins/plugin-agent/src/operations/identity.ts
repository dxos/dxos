//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Filter, Obj } from '@dxos/echo';
import { type RDF, normalizeEntityId } from '@dxos/pipeline-rdf';
import { Person } from '@dxos/types';

import { ChatParticipant } from '#types';

/**
 * The people an agent can name, by the slugs their names normalize to: a fact or a rule names a person
 * by their identity DID, so that "Rich", "rich" and "Rich Burdon" are one entity, and two people who
 * share a first name are not.
 */
export type Roster = {
  /** Slug of a full, preferred or nick name, or an unambiguous first name → the person's DID. */
  readonly byName: ReadonlyMap<string, string>;
  /** DID → the person's display name, for showing a speaker to a model or a person. */
  readonly names: ReadonlyMap<string, string>;
};

/** The person's identity DID, if they have one. */
export const identityOf = (person: Obj.Unknown | undefined): string | undefined =>
  person && Obj.instanceOf(Person.Person, person)
    ? person.identities?.find(({ label }) => label === ChatParticipant.IDENTITY_LABEL)?.value
    : undefined;

/** Builds a roster from `people`; a first name shared by two people is left out rather than guessed. */
export const makeRoster = (people: readonly Person.Person[]): Roster => {
  const byName = new Map<string, string>();
  const names = new Map<string, string>();
  const firstNames = new Map<string, string | null>();
  for (const person of people) {
    const did = identityOf(person);
    if (did === undefined) {
      continue;
    }
    const display = person.preferredName ?? person.fullName ?? person.nickname;
    if (display) {
      names.set(did, display);
    }
    for (const name of [person.fullName, person.preferredName, person.nickname]) {
      if (name?.trim()) {
        byName.set(normalizeEntityId(name), did);
        const first = normalizeEntityId(name.trim().split(/\s+/)[0]);
        firstNames.set(first, firstNames.has(first) && firstNames.get(first) !== did ? null : did);
      }
    }
  }
  for (const [first, did] of firstNames) {
    if (did !== null && !byName.has(first)) {
      byName.set(first, did);
    }
  }
  return { byName, names };
};

/** The roster of the people in the space who have an identity. */
export const loadRoster: Effect.Effect<Roster, never, Database.Service> = Database.query(
  Filter.type(Person.Person),
).run.pipe(
  Effect.map(makeRoster),
  Effect.orElseSucceed(() => makeRoster([])),
);

/** The key a name is looked up by: pipeline-rdf's entity slug. */
export const slug = (name: string): string => normalizeEntityId(name);

/** The entity id a name refers to: the person's DID when the roster knows them, else the name's slug. */
export const resolveName = (roster: Roster, name: string): string => roster.byName.get(slug(name)) ?? slug(name);

/** How to show an entity id: a known person's name, else the id itself. */
export const displayName = (roster: Roster, entity: string): string => roster.names.get(entity) ?? entity;

const resolveTerm = (roster: Roster, term: RDF.Term): RDF.Term => {
  if (term.kind !== 'entity') {
    return term;
  }
  const did =
    roster.byName.get(term.entity) ?? (term.label ? roster.byName.get(normalizeEntityId(term.label)) : undefined);
  return did === undefined ? term : { ...term, entity: did, label: term.label ?? term.entity };
};

/** The fact with its subject and object naming known people by DID. */
export const resolveFact = (roster: Roster, fact: RDF.Fact): RDF.Fact => ({
  ...fact,
  assertion: {
    ...fact.assertion,
    subject: resolveTerm(roster, fact.assertion.subject),
    object: resolveTerm(roster, fact.assertion.object),
  },
});
