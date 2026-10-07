//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Fact from './Fact.ts';
import type * as Rule from './Rule.ts';

/** Why a fact stopped holding. */
export type RetractReason = 'retracted' | 'superseded' | 'expired';

/** How a derived atom was first derived: the rule and the atoms it joined. */
export type Derivation =
  | { readonly _tag: 'fact'; readonly fact: string }
  | { readonly _tag: 'rule'; readonly rule: string; readonly premises: readonly Rule.GroundAtom[] };

type Common = {
  /** Unique per brain and ordered: `e<seq>`. */
  readonly id: string;
  readonly seq: number;
  /** Causal depth: 0 for an unprompted push, one more than the deepest event it names as its cause. */
  readonly depth: number;
  /** The registration whose push produced it, if any. */
  readonly origin?: string;
  /** Delivered by a `replay` subscription as a snapshot of the state at subscribe time. */
  readonly replay?: boolean;
};

export type Asserted = Common & { readonly kind: 'asserted'; readonly fact: Fact.Fact };

export type Retracted = Common & {
  readonly kind: 'retracted';
  readonly fact: Fact.Fact;
  readonly reason: RetractReason;
};

export type Derived = Common & {
  readonly kind: 'derived';
  readonly atom: Rule.GroundAtom;
  readonly derivation: Derivation;
};

/** A derived atom lost its last derivation. */
export type Underived = Common & { readonly kind: 'underived'; readonly atom: Rule.GroundAtom };

export type Violated = Common & {
  readonly kind: 'violated';
  readonly constraint: string;
  readonly bindings: Readonly<Record<string, Rule.Value>>;
};

export type Resolved = Common & {
  readonly kind: 'resolved';
  readonly constraint: string;
  readonly bindings: Readonly<Record<string, Rule.Value>>;
};

/** A change to the brain's knowledge. */
export type Event = Asserted | Retracted | Derived | Underived | Violated | Resolved;

export type Kind = Event['kind'];

/** Which events a subscription selects. */
export type Selector =
  | {
      readonly _tag: 'facts';
      readonly pattern: Fact.Pattern;
      /** Defaults to `['asserted']`. */
      readonly kinds?: readonly ('asserted' | 'retracted')[];
    }
  | {
      readonly _tag: 'atoms';
      readonly predicate: string;
      /** Values by position; `undefined` matches anything. Omit to match every tuple of the predicate. */
      readonly args?: readonly (Rule.Value | undefined)[];
      /** Defaults to `['derived']`. */
      readonly kinds?: readonly ('derived' | 'underived')[];
    }
  | {
      readonly _tag: 'violations';
      readonly constraint?: string;
      /** Defaults to `['violated']`. */
      readonly kinds?: readonly ('violated' | 'resolved')[];
    };

export type Subscription = {
  readonly selector: Selector;
  /** Also enqueue what already holds when subscribing; otherwise only later changes are delivered. */
  readonly replay?: boolean;
  /** Also deliver events the registration's own pushes caused; off so a consumer does not react to itself. */
  readonly includeOwn?: boolean;
};

/** An event waiting in a registration's outbox until it is acked. */
export type Delivery = {
  readonly id: string;
  readonly event: Event;
  /** The subscriptions it matched, in subscription order. */
  readonly subscriptions: readonly string[];
  /** How many times `take` has returned it; above 1 means a redelivery. */
  readonly attempts: number;
};

/** True when every value the pattern sets equals the argument at its position. */
export const matchesArgs = (
  pattern: readonly (Rule.Value | undefined)[] | undefined,
  args: readonly Rule.Value[],
): boolean =>
  pattern === undefined ||
  (pattern.length === args.length && pattern.every((value, index) => value === undefined || value === args[index]));

/** True when the selector selects the event. */
export const matches = (selector: Selector, event: Event): boolean => {
  switch (selector._tag) {
    case 'facts':
      return (
        (event.kind === 'asserted' || event.kind === 'retracted') &&
        (selector.kinds ?? ['asserted']).includes(event.kind) &&
        Fact.matches(selector.pattern, event.fact)
      );
    case 'atoms':
      return (
        (event.kind === 'derived' || event.kind === 'underived') &&
        (selector.kinds ?? ['derived']).includes(event.kind) &&
        event.atom.predicate === selector.predicate &&
        matchesArgs(selector.args, event.atom.args)
      );
    case 'violations':
      return (
        (event.kind === 'violated' || event.kind === 'resolved') &&
        (selector.kinds ?? ['violated']).includes(event.kind) &&
        (selector.constraint === undefined || selector.constraint === event.constraint)
      );
  }
};
