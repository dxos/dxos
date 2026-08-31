//
// Copyright 2026 DXOS.org
//

import { type SpaceDigest } from '../../replicants/client-replicant';

/**
 * The orchestrator's belief about the fleet: what should be true once everything has replicated.
 *
 * It holds no CRDT internals. Every field is chosen so that its converged value is a pure function
 * of the operations issued, independent of merge order — that is what makes exact equality with a
 * real peer decidable at all. Its counterpart on the wire is `SpaceDigest`, and `expectedDigest`
 * is the projection between them.
 */
export type ClientIndex = number;
export type IdentityIndex = number;

/** `offline` still edits locally; `down` cannot act at all. */
export type ClientState = 'online' | 'offline' | 'down';

export type ModelDocument = {
  deleted: boolean;
  /** Insertion order is nondeterministic under concurrent splices; the set of tokens is not. */
  tokens: Set<string>;
  /** Per-writer registers: client `i` only ever writes key `i`, so each value is predictable. */
  counters: Map<ClientIndex, number>;
};

export type ModelSpace = {
  members: Set<IdentityIndex>;
  /** Identities that should join at their next opportunity — decision D2. */
  pending: Set<IdentityIndex>;
  documents: ModelDocument[];
};

export type Model = {
  clients: { identity: IdentityIndex; state: ClientState }[];
  identities: { devices: ClientIndex[] }[];
  spaces: ModelSpace[];
  opSeq: number;
  /** Mirrored from the spec so preconditions stay a pure function of the model. */
  limits: { maxSpaces: number; maxDocumentsPerSpace: number; agents: boolean };
};

export const makeModel = (limits: Model['limits']): Model => ({
  clients: [],
  identities: [],
  spaces: [],
  opSeq: 0,
  limits,
});

/**
 * The starting model for a fleet shape: one identity per group, its devices online.
 *
 * Pure, so a command sequence can be simulated against it before any process exists — which is
 * what lets the plan record what will actually run rather than what was drawn.
 */
export const makeFleetModel = ({
  devicesPerIdentity,
  limits,
}: {
  devicesPerIdentity: number[];
  limits: Model['limits'];
}): Model => {
  const model = makeModel(limits);
  let cursor = 0;
  for (const [identity, devices] of devicesPerIdentity.entries()) {
    model.identities.push({ devices: [] });
    for (let device = 0; device < devices; device++) {
      const client = cursor++;
      model.clients.push({ identity, state: 'online' });
      model.identities[identity].devices.push(client);
    }
  }
  return model;
};

/** Globally unique, so a token proves which client authored it and cannot collide with another. */
export const token = (client: ClientIndex, seq: number): string => `⟦c${client}-${seq}⟧`;

export const documentId = (spaceSlot: number, documentSlot: number): string => `s${spaceSlot}-d${documentSlot}`;

//
// Pure queries. Preconditions read these only — fast-check requires `check` to be pure.
//

export const identityOf = (model: Model, client: ClientIndex): IdentityIndex => model.clients[client].identity;

export const isMember = (model: Model, client: ClientIndex, spaceSlot: number): boolean =>
  model.spaces[spaceSlot]?.members.has(identityOf(model, client)) ?? false;

export const canAct = (model: Model, client: ClientIndex): boolean => model.clients[client].state !== 'down';

export const liveDocument = (model: Model, spaceSlot: number, documentSlot: number): ModelDocument | undefined => {
  const document = model.spaces[spaceSlot]?.documents[documentSlot];
  return document && !document.deleted ? document : undefined;
};

/**
 * Whether some device of a member identity is online and can therefore admit a joiner. The agent
 * is always online, so an identity with an agent always qualifies once it is a member.
 */
export const hasAdmittingDevice = (model: Model, spaceSlot: number): boolean => {
  const space = model.spaces[spaceSlot];
  if (!space) {
    return false;
  }
  if (model.limits.agents && space.members.size > 0) {
    return true;
  }
  return [...space.members].some((identity) =>
    model.identities[identity].devices.some((device) => model.clients[device].state === 'online'),
  );
};

/**
 * A client coming online joins every space its identity is still pending on, provided somebody can
 * admit it — decision D2, "eventually joins".
 */
export const resolvablePendingSpaces = (model: Model, client: ClientIndex): number[] =>
  model.spaces
    .map((space, slot) => ({ space, slot }))
    .filter(({ space, slot }) => space.pending.has(identityOf(model, client)) && hasAdmittingDevice(model, slot))
    .map(({ slot }) => slot);

export const onlineMemberDevices = (model: Model, spaceSlot: number): ClientIndex[] =>
  model.clients
    .map((client, index) => ({ client, index }))
    .filter(({ client, index }) => client.state === 'online' && isMember(model, index, spaceSlot))
    .map(({ index }) => index);

//
// Projection onto what a peer can actually be observed to hold.
//

export const expectedDigest = (model: Model, spaceSlot: number): SpaceDigest => {
  const docs: SpaceDigest['docs'] = {};
  model.spaces[spaceSlot].documents.forEach((document, slot) => {
    if (document.deleted) {
      return;
    }
    docs[documentId(spaceSlot, slot)] = {
      tokens: [...document.tokens].sort(),
      counters: model.clients.map((_, client) => document.counters.get(client) ?? 0),
    };
  });
  return { docs };
};

/**
 * Digest key order follows each peer's own query order, so equality has to be checked on a
 * canonical form or identical states would compare unequal.
 */
export const canonical = (digest: SpaceDigest): string =>
  JSON.stringify(
    Object.keys(digest.docs)
      .sort()
      .map((docId) => [docId, digest.docs[docId].tokens, digest.docs[docId].counters]),
  );
