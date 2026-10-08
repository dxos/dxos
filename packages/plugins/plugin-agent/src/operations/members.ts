//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Stream from 'effect/Stream';

import type * as Agent from '@dxos/assistant/Agent';
import { Database, Obj } from '@dxos/echo';
import { Space } from '@dxos/halo';
import { type RDF } from '@dxos/pipeline-rdf';
import { Person } from '@dxos/types';

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

/** A term naming a member is re-keyed to the member's DID; its surface form stays the label. */
const resolveTerm = (members: readonly Space.Member[], term: RDF.Term): RDF.Term => {
  if (term.kind !== 'entity') {
    return term;
  }
  const member = memberByName(members, term.label ?? term.entity);
  return member?.did ? { ...term, entity: member.did, label: term.label ?? member.displayName } : term;
};

/** Re-keys the fact's subject and object to the members they name. */
export const resolveTerms = (members: readonly Space.Member[], fact: RDF.Fact): RDF.Fact => ({
  ...fact,
  assertion: {
    ...fact.assertion,
    subject: resolveTerm(members, fact.assertion.subject),
    object: resolveTerm(members, fact.assertion.object),
  },
});
