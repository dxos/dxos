//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

import { FactStore, RDF, type SemanticIndexError, hashText } from '@dxos/pipeline-rdf';

import { lexiconSentiment } from '../pipeline/sentiment-lexicon.ts';
import { ANNOTATIONS, FIN, MARKET } from '../pipeline/vocabulary.ts';
import { type TextItem, itemSource, itemText } from '../sources/text-item.ts';

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

/** The items published within `days` of `now`. */
export const withinDays = (items: readonly TextItem[], days: number, now = Date.now()): TextItem[] =>
  items.filter((item) => now - Date.parse(item.published) <= days * 24 * 60 * 60 * 1000);

/** A stable sample of `size` items, ordered by a hash of the key so it spreads over feeds and days. */
export const sample = (items: readonly TextItem[], size: number): TextItem[] =>
  [...items]
    .map((item) => [hashText(itemSource(item)), item] as const)
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(0, size)
    .map(([, item]) => item);

/** Items per publication day (`2026-10-17`), oldest first. */
export const perDay = (items: readonly TextItem[]): Array<[string, number]> => {
  const days = new Map<string, number>();
  for (const item of items) {
    const day = item.published.slice(0, 10);
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
  items: readonly TextItem[],
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

const value = (row: Readonly<Record<string, { readonly value: string }>>, name: string): string =>
  row[name]?.value ?? '';

/**
 * One company's sources side by side, by day: the mean sentiment of the news that mentions it, its close and daily
 * return, its short-volume ratio, and its insiders' trades. Every row comes from the one fact store, joined on the
 * company's IRI.
 */
export const crossSourceReport = (
  company: string,
  ticker: string,
): Effect.Effect<string[], SemanticIndexError, FactStore> =>
  Effect.gen(function* () {
    const store = yield* FactStore;
    const sentiment = yield* store.rows(`
      SELECT ?article ?score ?date ?headline WHERE {
        GRAPH ?g { ?s <${ANNOTATIONS.sentimentAbout.iri}> <${company}> . ?s <${ANNOTATIONS.sentimentScore.iri}> ?score . ?s <${ANNOTATIONS.expressedIn.iri}> ?article }
        GRAPH ?h { ?article <${ANNOTATIONS.datePublished.iri}> ?date . ?article <${ANNOTATIONS.headline.iri}> ?headline }
      }`);
    const prices = yield* store.rows(`
      SELECT ?date ?close ?change WHERE {
        GRAPH ?g { ?row <${MARKET.about.iri}> <${company}> . ?row <${MARKET.observedOn.iri}> ?date . ?row <${MARKET.close.iri}> ?close .
          OPTIONAL { ?row <${MARKET.changePercent.iri}> ?change } }
      }`);
    const shorts = yield* store.rows(`
      SELECT ?date ?ratio WHERE {
        GRAPH ?g { ?row <${MARKET.about.iri}> <${company}> . ?row <${MARKET.observedOn.iri}> ?date . ?row <${MARKET.shortRatio.iri}> ?ratio }
      }`);
    const trades = yield* store.rows(`
      SELECT ?date ?name ?code ?shares ?price WHERE {
        GRAPH ?g { ?row <${MARKET.about.iri}> <${company}> . ?row <${MARKET.observedOn.iri}> ?date . ?row <${MARKET.transactionCode.iri}> ?code .
          ?row <${MARKET.shares.iri}> ?shares . ?row <${MARKET.insider.iri}> ?insider . ?insider <${RDF.Vocab.RDFS_LABEL}> ?name .
          OPTIONAL { ?row <${MARKET.pricePerShare.iri}> ?price } }
      }`);

    type Day = {
      scores: number[];
      headlines: string[];
      close?: string;
      change?: string;
      short?: string;
      trades: string[];
    };
    const byDay = new Map<string, Day>();
    const day = (date: string): Day => {
      const key = date.slice(0, 10);
      const existing = byDay.get(key);
      if (existing) {
        return existing;
      }
      const created: Day = { scores: [], headlines: [], trades: [] };
      byDay.set(key, created);
      return created;
    };
    const seen = new Set<string>();
    for (const row of sentiment) {
      if (seen.has(value(row, 'article'))) {
        continue;
      }
      seen.add(value(row, 'article'));
      const entry = day(value(row, 'date'));
      entry.scores.push(Number(value(row, 'score')));
      entry.headlines.push(
        `${Number(value(row, 'score')) >= 0 ? '+' : ''}${value(row, 'score')} ${value(row, 'headline')}`,
      );
    }
    for (const row of prices) {
      Object.assign(day(value(row, 'date')), { close: value(row, 'close'), change: value(row, 'change') });
    }
    for (const row of shorts) {
      day(value(row, 'date')).short = value(row, 'ratio');
    }
    for (const row of trades) {
      const price = value(row, 'price');
      day(value(row, 'date')).trades.push(
        `${value(row, 'name')} ${value(row, 'code')} ${Number(value(row, 'shares')).toLocaleString('en-US')}${price && price !== '0' ? ` @ $${price}` : ''}`,
      );
    }

    const lines = [
      `${ticker} (${company}): ${seen.size} articles with sentiment, ${prices.length} price days, ${shorts.length} short-volume days, ${trades.length} insider transactions`,
      `  ${'day'.padEnd(10)}  ${'news'.padStart(4)}  ${'sent'.padStart(5)}  ${'close'.padStart(8)}  ${'chg%'.padStart(6)}  ${'short'.padStart(5)}  insider trades`,
    ];
    // Prices reach back further than the news; the table starts at the first day with news.
    const first = [...byDay.entries()]
      .filter(([, entry]) => entry.scores.length > 0)
      .map(([date]) => date)
      .sort()[0];
    for (const [date, entry] of [...byDay.entries()]
      .filter(([date]) => first === undefined || date >= first)
      .sort(([left], [right]) => left.localeCompare(right))) {
      const mean =
        entry.scores.length > 0 ? entry.scores.reduce((sum, score) => sum + score, 0) / entry.scores.length : undefined;
      lines.push(
        `  ${date}  ${String(entry.scores.length).padStart(4)}  ${(mean === undefined ? '' : mean.toFixed(2)).padStart(5)}  ${(entry.close ?? '').padStart(8)}  ${(entry.change ?? '').padStart(6)}  ${(entry.short ?? '').padStart(5)}  ${entry.trades.join('; ')}`,
      );
    }
    const headlines = [...byDay.entries()]
      .sort(([left], [right]) => right.localeCompare(left))
      .flatMap(([date, entry]) => entry.headlines.map((headline) => `  ${date}  ${headline}`))
      .slice(0, 12);
    return [...lines, 'Latest headlines (score):', ...headlines];
  });
