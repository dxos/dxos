//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Agent from '@dxos/assistant/Agent';
import { Database, Filter, Obj, type Ref } from '@dxos/echo';
import { Organization, Person } from '@dxos/types';

import { AgentPresence, BrainService, Knowledge } from '#types';

import { AgentOperationError } from './errors.ts';
import { personDid } from './members.ts';

/** The agent whose brain records a memory: the one named, else the space's only agent. */
export const recordingAgent = Effect.fnUntraced(function* (ref: Ref.Ref<Agent.Agent> | undefined) {
  if (ref) {
    return yield* Database.load(ref);
  }
  const agents = yield* Database.query(Filter.type(Agent.Agent)).run;
  if (agents.length !== 1) {
    return yield* Effect.fail(new AgentOperationError({ message: 'Pass the agent you run as.' }));
  }
  return agents[0];
});

/** pipeline-rdf's slug for a surface form (`normalizeEntityId`), restated to keep its query engine out of this module. */
const slug = (label: string): string =>
  label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

/**
 * The entity keys a fact about the entity may use: its object URI, a person's member id, and its names for facts
 * read before it existed.
 */
export const entityKeys = (entity: Obj.Unknown): Set<string> => {
  const name = (field: string): string | undefined => {
    const value = Reflect.get(entity, field);
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  };
  const fullName = name('fullName');
  const names = [fullName, fullName?.split(/\s+/)[0], name('preferredName'), name('nickname'), name('name')]
    .filter((value) => value !== undefined)
    .map(slug)
    .filter((value) => value.length > 0);
  const did = personDid(entity);
  return new Set([Obj.getURI(entity), ...(did ? [did] : []), ...names, ...identityValues(entity)]);
};

/** The values of an object's account identities (a Discord username or id, an email address), when it has any. */
export const identityValues = (entity: Obj.Unknown): string[] => {
  const identities: unknown = Reflect.get(entity, 'identities');
  return Array.isArray(identities)
    ? identities.flatMap((identity: unknown) => {
        const value = typeof identity === 'object' && identity !== null ? Reflect.get(identity, 'value') : undefined;
        return typeof value === 'string' && value.length > 0 ? [value] : [];
      })
    : [];
};

/** An object's strong identifiers: its URI, its DID and its account identities, never its names. */
export const strongEntityKeys = (entity: Obj.Unknown): string[] => {
  const did = personDid(entity);
  return [Obj.getURI(entity), ...(did ? [did] : []), ...identityValues(entity)];
};

/** The strong identifiers of the space's people and organizations, one list each: what identity groups start from. */
export const knownIdentities = Effect.gen(function* () {
  const entities = yield* Database.query(Filter.or(Filter.type(Person.Person), Filter.type(Organization.Organization)))
    .run;
  return entities.map(strongEntityKeys);
});

/** Every fact in the brains of the space's agents, each once: two agents reading one document store the same facts. */
export const spaceFacts = Effect.gen(function* () {
  const brain = yield* BrainService.BrainService;
  const agents = yield* Database.query(Filter.type(Agent.Agent)).run;
  // An agent invited from another space reads its home's brain, which holds what it learned in every space.
  const brains = [...new Set(agents.map(AgentPresence.brainId))];
  const facts = yield* Effect.forEach(brains, (id) => brain.query(id, {}));
  return [...new Map(facts.flat().map((fact) => [fact.id, fact])).values()];
});

/** The memories the space's agents hold, newest first, with their statuses. */
export const spaceMemories = spaceFacts.pipe(
  Effect.map((facts) => Knowledge.fromFacts(facts).sort(Knowledge.byNewest)),
);
