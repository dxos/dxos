//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Ast from '@dxos/datalog/Ast';
import type * as Engine from '@dxos/datalog/Engine';
import { RDF } from '@dxos/pipeline-rdf';

import type * as Vocabulary from './Vocabulary.ts';

/** Relations every fact contributes to, keyed by the fact id `F`. */
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
 * Encodes a fact as `fact(F, S, P, O)` plus one metadata relation per present field. `P` is the
 * canonical predicate when the vocabulary knows the surface form, which `surface(F, …)` keeps; a fact
 * without an illocution is `assertive`, and `supersedes` lists `attribution.wasDerivedFrom`.
 */
export const encode = (fact: RDF.Fact, vocabulary?: Vocabulary.Vocabulary): Engine.Entry[] => {
  const { id, assertion, factuality, illocution, attribution } = fact;
  const entries: Engine.Entry[] = [
    {
      relation: 'fact',
      tuple: [
        id,
        RDF.termValue(assertion.subject),
        vocabulary?.resolve(assertion.predicate) ?? assertion.predicate,
        RDF.termValue(assertion.object),
      ],
    },
    { relation: 'surface', tuple: [id, assertion.predicate] },
    { relation: 'force', tuple: [id, illocution?.force ?? 'assertive'] },
    { relation: 'polarity', tuple: [id, factuality.polarity] },
    { relation: 'factuality', tuple: [id, factuality.value] },
    { relation: 'source', tuple: [id, attribution.source] },
    { relation: 'saidAt', tuple: [id, attribution.generatedAtTime] },
    { relation: 'recordedAt', tuple: [id, fact.recordedAt] },
  ];
  const optional: ReadonlyArray<[string, string | number | undefined]> = [
    ['speaker', attribution.agent],
    ['mood', illocution?.mood],
    ['addressee', illocution?.addressee],
    ['quote', assertion.quote],
    ['validFrom', assertion.validFrom],
    ['validTo', assertion.validTo],
    ['confidence', factuality.confidence],
    ['nature', factuality.nature],
    ['pass', fact.pass],
  ];
  for (const [relation, value] of optional) {
    if (value !== undefined) {
      entries.push({ relation, tuple: [id, value] });
    }
  }
  for (const superseded of attribution.wasDerivedFrom ?? []) {
    entries.push({ relation: 'supersedes', tuple: [id, superseded] });
  }
  return entries;
};

/** The fact ids among base entries (from provenance). */
export const factIds = (entries: ReadonlyArray<Engine.Entry>): string[] => [
  ...new Set(
    entries.flatMap(({ relation, tuple }) =>
      relation in FACT_RELATIONS && typeof tuple[0] === 'string' ? [tuple[0]] : [],
    ),
  ),
];

/** An entry as a ground Datalog fact in the dialect goal rules are written in, e.g. `speaker("fact-1", dima).`. */
export const formatEntry = ({ relation, tuple }: Engine.Entry): string =>
  Ast.formatRule({ head: Ast.atom(relation, tuple.map(Ast.constant)), body: [] });

/** The relations the rules engine sees for a fact ({@link encode}), one ground Datalog fact per line. */
export const format = (fact: RDF.Fact, vocabulary?: Vocabulary.Vocabulary): string[] =>
  encode(fact, vocabulary).map(formatEntry);
