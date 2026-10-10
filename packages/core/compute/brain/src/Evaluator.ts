//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { type RDF } from '@dxos/pipeline-rdf';

import * as GoalRules from './GoalRules.ts';

/** A standing goal the evaluator watches: its compiled rules and when it began. */
export type Subscription = {
  readonly id: string;
  /** A goal program (`wake`, `achieved`, `holds`, `blocks`); see `Compiler`. */
  readonly rules: string;
  /** ISO time the subscription began; the rules' clock starts here. */
  readonly createdAt: string;
};

/** A wake of one subscription, ready to queue in its outbox. */
export type Event = {
  /**
   * Stable for the same wake: the subscription, the wake label and the facts behind it (or, for a
   * wake no fact caused, the evaluation time), so a host that re-derives a wake queues it once.
   */
  readonly id: string;
  readonly subscription: string;
  readonly label: string;
  readonly cause: GoalRules.Wake['cause'];
  /** The facts behind the wake, in the order they arrived. */
  readonly facts: ReadonlyArray<RDF.Fact>;
  /** Evaluation time (epoch ms). */
  readonly at: number;
};

export type PushOptions = {
  /** Evaluation time (epoch ms). */
  readonly at: number;
  /**
   * Speakers (entity ids) whose facts are evaluated but wake nothing on their own: an agent's own
   * words must not wake it. A wake resting on a quiet fact and another one still wakes.
   */
  readonly quiet?: ReadonlyArray<string>;
};

/** The id of an event: see {@link Event.id}. */
export const eventId = (subscription: string, label: string, facts: ReadonlyArray<string>, at: number): string =>
  facts.length > 0 ? `${subscription}:${label}:${[...facts].sort().join(',')}` : `${subscription}:${label}@${at}`;

/**
 * Evaluates every subscription of one brain over a shared fact stream. Synchronous and in memory: a
 * host keeps the facts and the outboxes in its own store, feeds pushes and clock ticks through
 * {@link Evaluator.push} and {@link Evaluator.tick}, and after a restart rebuilds the evaluator with
 * {@link Evaluator.hydrate}, which re-derives the rules' state without emitting events.
 */
export class Evaluator {
  readonly #goals = new Map<string, { subscription: Subscription; rules: GoalRules.GoalRules }>();
  /** Recent facts, which seed a subscription added later and resolve the facts behind a wake. */
  readonly #facts = new Map<string, RDF.Fact>();
  readonly #maxFacts: number;
  #at = 0;

  constructor({ maxFacts = GoalRules.MAX_FACTS }: { maxFacts?: number } = {}) {
    this.#maxFacts = maxFacts;
  }

  /** The subscriptions, in the order they were added. */
  get subscriptions(): Subscription[] {
    return [...this.#goals.values()].map(({ subscription }) => subscription);
  }

  has(id: string): boolean {
    return this.#goals.has(id);
  }

  /**
   * Adds or replaces a subscription. It sees the facts already held (said before it began, so its
   * rules can read history) without waking on them.
   * @throws Compiler.CompileError if the rules do not compile; nothing is changed.
   */
  add(subscription: Subscription): void {
    const rules = makeRules(subscription);
    if (this.#facts.size > 0) {
      // Wakes on facts said before the subscription existed are discarded: it watches from now on.
      rules.update({ at: Math.max(this.#at, startOf(subscription)), facts: [...this.#facts.values()] });
    }
    this.#goals.set(subscription.id, { subscription, rules });
  }

  /** Removes a subscription; false when it was not held. */
  remove(id: string): boolean {
    return this.#goals.delete(id);
  }

  /** Evaluates new facts at time `at`; returns the wakes, one event each. */
  push(facts: ReadonlyArray<RDF.Fact>, { at, quiet = [] }: PushOptions): Event[] {
    const quietIds = new Set(
      facts
        .filter(({ attribution }) => attribution.agent !== undefined && quiet.includes(attribution.agent))
        .map(({ id }) => id),
    );
    this.#remember(facts);
    return this.#evaluate({ at, facts }, quietIds);
  }

  /** Re-evaluates the clock at time `at` (a scheduled tick); returns the wakes. */
  tick(at: number): Event[] {
    return this.#evaluate({ at }, new Set());
  }

  /**
   * Rebuilds state after a restart: adds the subscriptions and replays the facts as of `at` (the last
   * evaluation before the restart), emitting nothing. Wakes due since then come from the next
   * {@link tick} or {@link push}.
   * @throws Compiler.CompileError if a subscription's rules do not compile.
   */
  hydrate(subscriptions: ReadonlyArray<Subscription>, facts: ReadonlyArray<RDF.Fact>, at: number): void {
    this.#goals.clear();
    this.#facts.clear();
    this.#remember(facts);
    this.#at = at;
    for (const subscription of subscriptions) {
      const rules = makeRules(subscription);
      rules.update({ at: Math.max(at, startOf(subscription)), facts: [...this.#facts.values()] });
      this.#goals.set(subscription.id, { subscription, rules });
    }
  }

  /** The earliest time any subscription's clock can next change; see `GoalRules.nextDueAt`. */
  nextDueAt(): number | undefined {
    const due = [...this.#goals.values()]
      .map(({ rules }) => rules.nextDueAt())
      .filter((time): time is number => time !== undefined);
    return due.length === 0 ? undefined : Math.min(...due);
  }

  #evaluate(input: { at: number; facts?: ReadonlyArray<RDF.Fact> }, quiet: ReadonlySet<string>): Event[] {
    this.#at = Math.max(this.#at, input.at);
    const events: Event[] = [];
    for (const { subscription, rules } of this.#goals.values()) {
      const { wakes } = rules.update({ at: input.at, facts: input.facts });
      for (const wake of wakes) {
        if (wake.facts.length > 0 && wake.facts.every((id) => quiet.has(id))) {
          continue;
        }
        events.push({
          id: eventId(subscription.id, wake.label, wake.facts, input.at),
          subscription: subscription.id,
          label: wake.label,
          cause: wake.cause,
          facts: wake.facts.flatMap((id) => {
            const fact = this.#facts.get(id);
            return fact ? [fact] : [];
          }),
          at: input.at,
        });
      }
    }
    return events;
  }

  /** Keeps the newest facts, at most `maxFacts`, in arrival order. */
  #remember(facts: ReadonlyArray<RDF.Fact>): void {
    for (const fact of facts) {
      this.#facts.delete(fact.id);
      this.#facts.set(fact.id, fact);
    }
    for (const id of this.#facts.keys()) {
      if (this.#facts.size <= this.#maxFacts) {
        break;
      }
      this.#facts.delete(id);
    }
  }
}

const startOf = ({ createdAt }: Subscription): number => {
  const time = Date.parse(createdAt);
  return Number.isNaN(time) ? 0 : time;
};

const makeRules = (subscription: Subscription): GoalRules.GoalRules =>
  GoalRules.make({ source: subscription.rules, createdAt: startOf(subscription) });

/** Creates an evaluator. */
export const make = (options?: { maxFacts?: number }): Evaluator => new Evaluator(options);
