//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import type * as Option from 'effect/Option';

import type * as Event from './Event.ts';
import type * as Fact from './Fact.ts';
import { makeCore } from './internal/core.ts';
import { ConflictError, ConsistencyError, LoopError, UnknownRegistrationError } from './internal/errors.ts';
import type * as Rule from './Rule.ts';

export { ConflictError, ConsistencyError, LoopError, UnknownRegistrationError };

export type PushOptions = {
  /** The registration pushing, so its own subscriptions skip what the push causes. */
  readonly origin?: string;
  /** Ids of the events this push reacts to; its depth is one more than theirs. */
  readonly cause?: readonly string[];
};

/** How a change was evaluated: not at all, by joining only the new tuples, or from scratch. */
export type Mode = 'none' | 'incremental' | 'full';

export type ChangeResult = {
  /** Ids of the events the change produced, in delivery order. */
  readonly events: readonly string[];
  readonly mode: Mode;
  /** Tuples derived by the evaluation (a full evaluation re-derives everything). */
  readonly derived: number;
};

export type PushResult = ChangeResult & {
  readonly added: readonly string[];
  /** Ids already held with the same content; pushing them again changes nothing. */
  readonly duplicates: readonly string[];
};

export type RetractResult = ChangeResult & { readonly retracted: readonly string[] };

export type Ruleset = {
  readonly id: string;
  /** Datalog text; see `Rule.parse`. */
  readonly rules: string;
  /** What a violated constraint of this ruleset does to a change: refuse it (default) or report it; see `violations`. */
  readonly onViolation?: 'reject' | 'flag';
};

/** Why an atom holds: the fact it projects from, or the rule and the proofs of its premises. */
export type Proof =
  | { readonly _tag: 'fact'; readonly atom: Rule.GroundAtom; readonly fact: Fact.Fact }
  | {
      readonly _tag: 'rule';
      readonly atom: Rule.GroundAtom;
      readonly rule: string;
      readonly text: string;
      readonly premises: readonly Proof[];
    };

export type Violation = { readonly constraint: string; readonly bindings: Readonly<Record<string, Rule.Value>> };

export type RegisterOptions = { readonly meta?: Readonly<Record<string, unknown>> };

export type TakeOptions = {
  /** Most deliveries to return; the rest stay queued. */
  readonly max?: number;
};

export type Options = {
  /** Deepest causal chain a push may extend; deeper pushes fail with {@link LoopError}. */
  readonly maxDepth?: number;
  /** Most deliveries an outbox holds; further matches are dropped and counted until the consumer acks. */
  readonly maxOutbox?: number;
};

/** A registration's backlog, so a consumer can tell it fell behind. */
export type OutboxStatus = {
  readonly pending: number;
  /** Deliveries dropped because the outbox was full. */
  readonly dropped: number;
  readonly subscriptions: number;
};

/**
 * An agent's brain: a knowledge base (push, retract, query, ask), the rules it reasons with, and an event base
 * where each registration's subscriptions fill an outbox that the consumer takes and acks.
 */
export interface Service {
  /** Adds facts; ids already held with equal content are skipped, so a re-push is a no-op. */
  readonly push: (
    facts: readonly Fact.Input[],
    options?: PushOptions,
  ) => Effect.Effect<PushResult, Fact.ValidationError | ConflictError | ConsistencyError | LoopError>;

  /** Stops facts holding; they stay in the store, inactive, for audit. */
  readonly retract: (
    ids: readonly string[],
    options?: PushOptions,
  ) => Effect.Effect<RetractResult, Fact.ValidationError | ConsistencyError | LoopError>;

  /** Facts matching the pattern in the order they were pushed; inactive ones only when asked. */
  readonly query: (pattern?: Fact.Pattern, options?: { readonly inactive?: boolean }) => Effect.Effect<Fact.Fact[]>;

  /** Bindings of the named variables for which a conjunctive query holds, e.g. `wake(G, R), not achieved(G)`. */
  readonly ask: (
    query: string,
  ) => Effect.Effect<Readonly<Record<string, Rule.Value>>[], Rule.ParseError | Rule.InvalidRuleError>;

  /** Why an atom holds, down to the facts; none when it does not. */
  readonly explain: (atom: Rule.GroundAtom) => Effect.Effect<Option.Option<Proof>>;

  /**
   * The constraints violated now. A `reject` constraint refuses any push, retraction or rule change that would
   * violate it, but `tick` cannot refuse the passage of time, so expiry or `elapsed` can still violate one and it
   * is then reported here like a flagged one.
   */
  readonly violations: () => Effect.Effect<Violation[]>;

  /** Adds or replaces a ruleset; the program is re-stratified and every conclusion re-derived. */
  readonly addRules: (
    ruleset: Ruleset,
  ) => Effect.Effect<
    ChangeResult,
    Rule.ParseError | Rule.InvalidRuleError | Rule.StratificationError | ConsistencyError
  >;

  /** Removes a ruleset and withdraws what only it derived; false when it was not held. */
  readonly removeRules: (id: string) => Effect.Effect<boolean, ConsistencyError>;

  /** Re-reads the clock: expires facts past `validTo` and re-evaluates rules that read time; it never refuses. */
  readonly tick: () => Effect.Effect<ChangeResult>;

  /** Creates a registration and its outbox; registering an existing id keeps its outbox. */
  readonly register: (id: string, options?: RegisterOptions) => Effect.Effect<void>;

  /** Adds a subscription to a registration and returns its id. */
  readonly subscribe: (
    registration: string,
    subscription: Event.Subscription,
  ) => Effect.Effect<string, UnknownRegistrationError>;

  /** The oldest unacked deliveries, in order; they stay queued until acked, so a crash redelivers them. */
  readonly take: (
    registration: string,
    options?: TakeOptions,
  ) => Effect.Effect<Event.Delivery[], UnknownRegistrationError>;

  /** Removes deliveries from the outbox; unknown ids are ignored. Returns how many were removed. */
  readonly ack: (registration: string, ids: readonly string[]) => Effect.Effect<number, UnknownRegistrationError>;

  /** How far a registration's consumer is behind. */
  readonly status: (registration: string) => Effect.Effect<OutboxStatus, UnknownRegistrationError>;

  /** Removes one subscription, or with no id the registration and its outbox; false when not held. */
  readonly unsubscribe: (registration: string, subscription?: string) => Effect.Effect<boolean>;
}

export class Brain extends Context.Service<Brain, Service>()('@dxos/brain/Brain') {}

/** Re-exported so callers importing this module as a namespace avoid `Brain.Brain.key`. */
export const key = Brain.key;

export const DEFAULT_MAX_DEPTH = 8;

export const DEFAULT_MAX_OUTBOX = 10_000;

/** A brain held in memory; every operation is serialized, and every read of time goes through `Clock`. */
export const make = (options: Options = {}): Effect.Effect<Service> =>
  makeCore({
    maxDepth: options.maxDepth ?? DEFAULT_MAX_DEPTH,
    maxOutbox: options.maxOutbox ?? DEFAULT_MAX_OUTBOX,
  });

export const layer = (options?: Options): Layer.Layer<Brain> => Layer.effect(Brain, make(options));

/** The ids of the facts a proof rests on, each once, in proof order. */
export const supportingFacts = (proof: Proof): string[] => {
  const ids = new Set<string>();
  const visit = (node: Proof) => {
    if (node._tag === 'fact') {
      ids.add(node.fact.id);
    } else {
      node.premises.forEach(visit);
    }
  };
  visit(proof);
  return [...ids];
};
