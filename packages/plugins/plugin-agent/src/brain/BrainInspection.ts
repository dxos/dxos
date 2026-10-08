//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Compiler from '@dxos/brain/Compiler';
import * as Encoding from '@dxos/brain/Encoding';
import { type RDF } from '@dxos/pipeline-rdf';

import { FactEntry, Trigger, type TriggerOperation } from '#types';

/** A stored fact, with the one-line summary the debug view lists it by. */
export type Fact = {
  id: string;
  /** Subject, predicate and object. */
  text: string;
  /** Who said it: the member's name when known, else the id facts carry. */
  speaker?: string;
  saidAt: string;
  fact: RDF.Fact;
};

/** A fact as the rules engine sees it: the ground Datalog facts `@dxos/brain` encodes it to. */
export type EncodedFact = {
  id: string;
  lines: string[];
};

/** An unacknowledged event in a subscription's outbox. */
export type PendingEvent = {
  id: string;
  label: string;
  at: string;
  /** The ids of the facts behind the wake; empty for a wake the clock caused. */
  facts: string[];
};

/** A subscription with the rules it is evaluated by and its outbox. */
export type Subscription = {
  id: string;
  /** The fact pattern, as one line. */
  when: string;
  /** The rules the evaluator runs. */
  rules: string;
  /** True when the trigger carries rules compiled from its goal; false when they are its pattern translated. */
  compiled: boolean;
  ongoing: boolean;
  createdAt: string;
  /** The goal's URI. */
  goal?: string;
  request?: string;
  /** The recipient's URI. */
  recipient: string;
  message: string;
  /** Oldest first. */
  pending: PendingEvent[];
};

export type Stats = {
  facts: number;
  subscriptions: number;
  /** Unacknowledged events across every outbox. */
  pending: number;
  oldestPendingAt?: string;
  /** When the agent's rules next read the clock. */
  nextDueAt?: string;
};

export type Inspection = {
  /** Newest first. */
  facts: Fact[];
  /** In the order of {@link Inspection.facts}. */
  encoding: EncodedFact[];
  /** Oldest first. */
  subscriptions: Subscription[];
  stats: Stats;
};

export type MakeOptions = {
  /** Names the member an id denotes; ids pass through by default. */
  label?: (id: string) => string;
};

/** Shapes a brain snapshot for the debug view, encoding facts with the vocabulary the evaluator uses. */
export const make = (
  { facts, subscriptions, nextDueAt }: TriggerOperation.BrainSnapshot,
  { label = (id) => id }: MakeOptions = {},
): Inspection => {
  const vocabulary = Compiler.defaultVocabulary();
  const sorted = [...facts].sort((left, right) =>
    right.attribution.generatedAtTime.localeCompare(left.attribution.generatedAtTime),
  );
  const shaped = subscriptions.map(({ trigger, pending }): Subscription => ({
    id: trigger.id,
    when: Trigger.describePattern(trigger.when, label),
    rules: Trigger.rulesOf(trigger),
    compiled: trigger.rules !== undefined,
    ongoing: trigger.ongoing ?? false,
    createdAt: trigger.createdAt,
    ...(trigger.goal ? { goal: trigger.goal.uri } : {}),
    ...(trigger.request ? { request: trigger.request } : {}),
    recipient: trigger.then.recipient.uri,
    message: trigger.then.message,
    pending: pending.map((event) => ({
      id: event.id,
      label: event.label,
      at: event.at,
      facts: event.facts.map((fact) => fact.id),
    })),
  }));
  const pendingTimes = shaped.flatMap(({ pending }) => pending.map(({ at }) => at)).sort();

  return {
    facts: sorted.map((fact) => {
      const speaker = fact.attribution.agentLabel ?? (fact.attribution.agent && label(fact.attribution.agent));
      return {
        id: fact.id,
        text: FactEntry.factText(fact),
        ...(speaker ? { speaker } : {}),
        saidAt: fact.attribution.generatedAtTime,
        fact,
      };
    }),
    encoding: sorted.map((fact) => ({ id: fact.id, lines: Encoding.format(fact, vocabulary) })),
    subscriptions: shaped,
    stats: {
      facts: facts.length,
      subscriptions: shaped.length,
      pending: pendingTimes.length,
      ...(pendingTimes.length > 0 ? { oldestPendingAt: pendingTimes[0] } : {}),
      ...(nextDueAt ? { nextDueAt } : {}),
    },
  };
};
