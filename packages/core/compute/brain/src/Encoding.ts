//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Engine from '@dxos/datalog/Engine';

import * as FactTuple from './FactTuple.ts';
import type * as Vocabulary from './Vocabulary.ts';

/** Relations every fact tuple contributes to, keyed by the tuple id `F`. */
export const FACT_RELATIONS = {
  fact: 4,
  speaker: 2,
  force: 2,
  polarity: 2,
  mood: 2,
  factuality: 2,
  addressee: 2,
  quote: 2,
  source: 2,
  saidAt: 2,
  surface: 2,
  supersedes: 2,
  validFrom: 2,
  validTo: 2,
  confidence: 2,
  nature: 2,
  recordedAt: 2,
  pass: 2,
} as const;

/** Relations the goal runtime maintains: sub-goal status and proposed actions. */
export const GOAL_RELATIONS = {
  subgoal: 2,
  status: 2,
  action: 2,
  actionArg: 3,
} as const;

/** Every base relation a goal rule may read. */
export const RELATIONS: Readonly<Record<string, number>> = { ...FACT_RELATIONS, ...GOAL_RELATIONS };

/**
 * Encodes a tuple as `fact(F, S, P, O)` plus one metadata relation per present field. `P` is the
 * canonical predicate when the vocabulary knows the surface form, which `surface(F, …)` keeps.
 */
export const encode = (tuple: FactTuple.FactTuple, vocabulary?: Vocabulary.Vocabulary): Engine.Entry[] => {
  const id = tuple.id;
  const entries: Engine.Entry[] = [
    {
      relation: 'fact',
      tuple: [
        id,
        FactTuple.termValue(tuple.subject),
        vocabulary?.resolve(tuple.predicate) ?? tuple.predicate,
        FactTuple.termValue(tuple.object),
      ],
    },
    { relation: 'surface', tuple: [id, tuple.predicate] },
    { relation: 'force', tuple: [id, tuple.force] },
    { relation: 'polarity', tuple: [id, tuple.polarity] },
    { relation: 'factuality', tuple: [id, tuple.factuality] },
    { relation: 'source', tuple: [id, tuple.source] },
    { relation: 'saidAt', tuple: [id, tuple.saidAt] },
    { relation: 'recordedAt', tuple: [id, tuple.recordedAt] },
    { relation: 'pass', tuple: [id, tuple.pass] },
  ];
  const optional: ReadonlyArray<[string, string | number | undefined]> = [
    ['speaker', tuple.speaker],
    ['mood', tuple.mood],
    ['addressee', tuple.addressee],
    ['quote', tuple.quote],
    ['validFrom', tuple.validFrom],
    ['validTo', tuple.validTo],
    ['confidence', tuple.confidence],
    ['nature', tuple.nature],
  ];
  for (const [relation, value] of optional) {
    if (value !== undefined) {
      entries.push({ relation, tuple: [id, value] });
    }
  }
  for (const superseded of tuple.supersedes ?? []) {
    entries.push({ relation: 'supersedes', tuple: [id, superseded] });
  }
  return entries;
};

/** The fact tuple ids among base entries (from provenance). */
export const factIds = (entries: ReadonlyArray<Engine.Entry>): string[] => [
  ...new Set(
    entries.flatMap(({ relation, tuple }) =>
      relation in FACT_RELATIONS && typeof tuple[0] === 'string' ? [tuple[0]] : [],
    ),
  ),
];
