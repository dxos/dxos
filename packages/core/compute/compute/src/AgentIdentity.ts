//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

/**
 * Identity of the actor authoring content within an operation. Today this is an agent (see
 * `assistant-toolkit` `Agent.did`); it attributes content the operation authors — e.g. the
 * `creator` of a suggestion branch — so it reads as its own author, distinct from the human user
 * and from other agents. Provided by the agent runtime for the duration of a tool/operation call.
 */
export interface Identity {
  /** Identity DID (e.g. an agent's `did:halo:` DID). */
  readonly did: string;
  /** Optional display name. */
  readonly name?: string;
  /** Optional palette hue. */
  readonly hue?: string;
}

export class AgentIdentity extends Context.Tag('@dxos/compute/AgentIdentity')<AgentIdentity, Identity>() {}

/**
 * The current author DID, or `undefined` when no {@link AgentIdentity} is in scope (e.g. a human-
 * initiated invocation). Reads optionally, so an operation that defaults its author from the agent
 * identity does not add a hard service requirement.
 */
export const currentDid: Effect.Effect<string | undefined> = Effect.serviceOption(AgentIdentity).pipe(
  Effect.map(Option.match({ onNone: () => undefined, onSome: (identity) => identity.did })),
);
