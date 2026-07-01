//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { StateError } from './errors';
import type * as Type from './types';

/** A single identifier for an agent, in some namespace (e.g. discord-user:1234567890). */
export type Identifier = {
  readonly namespace: string;
  readonly value: string;
};

/**
 * A canonical agent (sender/author). First-order identity: keyed by a stable token and carrying a
 * SET of identifiers across namespaces, so a later corpus (e.g. email) can be merged onto the same
 * agent. `ref` links to a canonical ECHO object (Person) when resolved — deferred to the browser path.
 */
export type Profile = {
  /** Canonical token (provisional: the first identifier as `namespace:value`; an ECHO DXN later). */
  readonly id: string;
  /** Best-known display label (not the key). */
  readonly label?: string;
  /** All identifiers known to denote this agent. */
  readonly identifiers: readonly Identifier[];
  readonly messageCount: number;
  /** ISO-8601 of the earliest/most-recent observed message. */
  readonly firstSeen?: string;
  readonly lastSeen?: string;
  /** DXN of a canonical ECHO Person, when resolved. */
  readonly ref?: string;
};

/** Observation recorded when an agent is seen authoring a message. */
export type Observation = {
  readonly identifiers: readonly Identifier[];
  readonly label?: string;
  /** ISO-8601 message time. */
  readonly at?: string;
};

export interface AgentRegistryApi {
  /** Resolve identifiers to a canonical agent, creating one if none of them is known. */
  readonly resolve: (identifiers: readonly Identifier[], label?: string) => Effect.Effect<Profile, StateError>;
  /** Resolve (or create) and fold an observation into the agent's stats. */
  readonly observe: (observation: Observation) => Effect.Effect<Profile, StateError>;
  readonly get: (id: string) => Effect.Effect<Profile | undefined, StateError>;
  /** All agents, most-active first. */
  readonly list: () => Effect.Effect<Profile[], StateError>;
  /** Union two agents under one canonical id (normalization); records a sameAs alias. */
  readonly merge: (keepId: string, mergeId: string) => Effect.Effect<Profile, StateError>;
}

export class AgentRegistry extends Context.Tag('@dxos/crawler/AgentRegistry')<AgentRegistry, AgentRegistryApi>() {
  /** In-memory registry (tests, demos). Browser path will back this with ECHO Person objects. */
  static layerMemory: Layer.Layer<AgentRegistry> = Layer.sync(AgentRegistry, () => makeMemory());
}

/**
 * Identifiers for a source user, stable id FIRST so it becomes the canonical token (the display
 * name is only an alias). Shared by the extract-facts and agent-profile stages.
 */
export const identifiersForUser = (user: Type.User): Identifier[] => [
  { namespace: `${user.source}-user`, value: user.id },
  ...(user.username ? [{ namespace: `${user.source}-username`, value: user.username }] : []),
];

/** Best display label for a source user: display name, else username, else the raw id. */
export const labelForUser = (user: Type.User): string | undefined => user.displayName ?? user.username ?? user.id;

const key = (identifier: Identifier) => `${identifier.namespace}:${identifier.value}`;

const earliest = (a?: string, b?: string) => (a === undefined ? b : b === undefined ? a : a < b ? a : b);
const latest = (a?: string, b?: string) => (a === undefined ? b : b === undefined ? a : a > b ? a : b);

const makeMemory = (): AgentRegistryApi => {
  const agents = new Map<string, Profile>();
  // identifier key -> canonical agent id (also serves as the sameAs alias map after merges).
  const index = new Map<string, string>();

  const findByIdentifiers = (identifiers: readonly Identifier[]): Profile | undefined => {
    for (const identifier of identifiers) {
      const id = index.get(key(identifier));
      if (id) {
        return agents.get(id);
      }
    }
    return undefined;
  };

  const mergeIdentifiers = (existing: readonly Identifier[], incoming: readonly Identifier[]): Identifier[] => {
    const seen = new Set(existing.map(key));
    const merged = [...existing];
    for (const identifier of incoming) {
      if (!seen.has(key(identifier))) {
        seen.add(key(identifier));
        merged.push(identifier);
      }
    }
    return merged;
  };

  const upsert = (
    identifiers: readonly Identifier[],
    label: string | undefined,
    at?: string,
    bump = false,
  ): Profile => {
    const existing = findByIdentifiers(identifiers);
    if (existing) {
      const next: Profile = {
        ...existing,
        label: existing.label ?? label,
        identifiers: mergeIdentifiers(existing.identifiers, identifiers),
        messageCount: existing.messageCount + (bump ? 1 : 0),
        firstSeen: bump ? earliest(existing.firstSeen, at) : existing.firstSeen,
        lastSeen: bump ? latest(existing.lastSeen, at) : existing.lastSeen,
      };
      agents.set(next.id, next);
      for (const identifier of next.identifiers) {
        index.set(key(identifier), next.id);
      }
      return next;
    }

    // Canonical token = the first identifier (stable id chosen by the caller's ordering).
    const id = key(identifiers[0]);
    const created: Profile = {
      id,
      label,
      identifiers: [...identifiers],
      messageCount: bump ? 1 : 0,
      firstSeen: bump ? at : undefined,
      lastSeen: bump ? at : undefined,
    };
    agents.set(id, created);
    for (const identifier of identifiers) {
      index.set(key(identifier), id);
    }
    return created;
  };

  return {
    resolve: (identifiers, label) =>
      identifiers.length === 0
        ? Effect.fail(new StateError({ message: 'resolve requires at least one identifier' }))
        : Effect.sync(() => upsert(identifiers, label)),
    observe: ({ identifiers, label, at }) =>
      identifiers.length === 0
        ? Effect.fail(new StateError({ message: 'observe requires at least one identifier' }))
        : Effect.sync(() => upsert(identifiers, label, at, true)),
    get: (id) => Effect.sync(() => agents.get(index.get(id) ?? id)),
    list: () => Effect.sync(() => [...agents.values()].sort((a, b) => b.messageCount - a.messageCount)),
    merge: (keepId, mergeId) =>
      Effect.gen(function* () {
        const keep = agents.get(keepId);
        const drop = agents.get(mergeId);
        if (keepId === mergeId) {
          return keep ?? (yield* Effect.fail(new StateError({ message: `merge: unknown agent ${keepId}` })));
        }
        if (!keep || !drop) {
          return yield* Effect.fail(new StateError({ message: `merge: unknown agent ${!keep ? keepId : mergeId}` }));
        }
        const merged: Profile = {
          ...keep,
          label: keep.label ?? drop.label,
          identifiers: mergeIdentifiers(keep.identifiers, drop.identifiers),
          messageCount: keep.messageCount + drop.messageCount,
          firstSeen: earliest(keep.firstSeen, drop.firstSeen),
          lastSeen: latest(keep.lastSeen, drop.lastSeen),
          ref: keep.ref ?? drop.ref,
        };
        agents.set(keepId, merged);
        agents.delete(mergeId);
        // Point the dropped agent's id and all its identifiers at the canonical agent (sameAs).
        index.set(mergeId, keepId);
        for (const identifier of merged.identifiers) {
          index.set(key(identifier), keepId);
        }
        return merged;
      }),
  };
};
