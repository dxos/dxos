//
// Copyright 2026 DXOS.org
//

import { appendFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

import { RDF } from '@dxos/pipeline-rdf';

import { type NewsItem, itemSource, itemText } from './news-item.ts';
import { lexiconSentiment } from './sentiment-lexicon.ts';
import { ANNOTATIONS, FIN } from './vocabulary.ts';

/** Where the finance runs keep their items, facts, trace and log, unless `FINANCE_DIR` names another place. */
export const financeDir = (env: NodeJS.ProcessEnv = process.env): string =>
  env.FINANCE_DIR ?? join(homedir(), '.local/share/dxos/magazine-pipeline/finance');

/** A logger that prints and appends to a run log. */
export const runLog = (path: string) => {
  mkdirSync(dirname(path), { recursive: true });
  return (...lines: string[]) => {
    for (const line of lines) {
      console.log(line);
      appendFileSync(path, `${line}\n`);
    }
  };
};

/** The items published within `days` of `now` (items with no date count as fetched). */
export const withinDays = (items: readonly NewsItem[], days: number, now = Date.now()): NewsItem[] =>
  items.filter((item) => now - Date.parse(item.published ?? item.fetchedAt) <= days * 24 * 60 * 60 * 1000);

/** A stable sample of `size` items: ordered by id, which is a hash, so it spreads over feeds and days. */
export const sample = (items: readonly NewsItem[], size: number): NewsItem[] =>
  [...items].sort((left, right) => left.id.localeCompare(right.id)).slice(0, size);

/** Items per publication day (`2026-10-17`), oldest first. */
export const perDay = (items: readonly NewsItem[]): Array<[string, number]> => {
  const days = new Map<string, number>();
  for (const item of items) {
    const day = (item.published ?? item.fetchedAt).slice(0, 10);
    days.set(day, (days.get(day) ?? 0) + 1);
  }
  return [...days.entries()].sort(([left], [right]) => left.localeCompare(right));
};

/** What an extraction produced, by predicate. */
export type FactMetrics = {
  readonly extracted: number;
  readonly annotations: number;
  readonly predicates: number;
  /** Extracted facts on a finance-pack predicate (schema.org finance terms or the FIBO-inspired ones). */
  readonly onFinance: number;
  /** Extracted facts on a predicate the extractor minted (the brain's namespace). */
  readonly minted: number;
  readonly mintedPredicates: number;
  readonly top: Array<[string, number]>;
};

const FINANCE_SCHEMA_TERMS = new Set(
  ['tickerSymbol', 'legalName', 'brand', 'numberOfEmployees', 'competitor'].map((name) => `${RDF.Vocab.SCHEMA}${name}`),
);

const isAnnotation = (fact: RDF.Fact): boolean => fact.extractor.id.startsWith('finance-');

/** Counts the store's facts: extracted against annotation, by predicate and vocabulary. */
export const factMetrics = (facts: readonly RDF.Fact[], top = 12): FactMetrics => {
  const extracted = facts.filter((fact) => !isAnnotation(fact));
  const byPredicate = new Map<string, number>();
  for (const fact of extracted) {
    const iri = fact.assertion.predicateIri ?? fact.assertion.predicate;
    byPredicate.set(iri, (byPredicate.get(iri) ?? 0) + 1);
  }
  const isMinted = (iri: string) => iri.startsWith(RDF.Vocab.LOCAL_BRAIN);
  const isFinance = (iri: string) => iri.startsWith(FIN) || FINANCE_SCHEMA_TERMS.has(iri);
  const count = (test: (iri: string) => boolean) =>
    [...byPredicate.entries()].filter(([iri]) => test(iri)).reduce((sum, [, value]) => sum + value, 0);
  return {
    extracted: extracted.length,
    annotations: facts.length - extracted.length,
    predicates: byPredicate.size,
    onFinance: count(isFinance),
    minted: count(isMinted),
    mintedPredicates: [...byPredicate.keys()].filter(isMinted).length,
    top: [...byPredicate.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, top)
      .map(([iri, value]) => [RDF.Ontology.labelFromIri(iri), value]),
  };
};

/** How often the model's article sentiment agrees with the lexicon baseline, over the items it rated. */
export const sentimentAgreement = (
  items: readonly NewsItem[],
  facts: readonly RDF.Fact[],
): { rated: number; agree: number; distribution: Record<string, number> } => {
  const bySource = new Map(items.map((item) => [itemSource(item), item]));
  let rated = 0;
  let agree = 0;
  const distribution: Record<string, number> = {};
  for (const fact of facts) {
    const item = bySource.get(fact.attribution.source);
    if (
      !item ||
      fact.extractor.model === 'lexicon' ||
      fact.assertion.predicateIri !== ANNOTATIONS.sentiment.iri ||
      fact.assertion.subject.kind !== 'entity' ||
      fact.assertion.subject.entity !== item.link ||
      fact.assertion.object.kind !== 'literal'
    ) {
      continue;
    }
    const polarity = fact.assertion.object.literal;
    distribution[polarity] = (distribution[polarity] ?? 0) + 1;
    rated++;
    if (lexiconSentiment(itemText(item)).polarity === polarity) {
      agree++;
    }
  }
  return { rated, agree, distribution };
};
