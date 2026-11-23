//
// Copyright 2026 DXOS.org
//

import { Fact, Graph, Hash, Ontology, Vocab } from '@dxos/echo-memory';

import { type TextItem, itemSource, itemText } from '../sources/text-item.ts';
import { type Sentiment } from './sentiment-lexicon.ts';
import { type TickerMention } from './tickers.ts';
import { ANNOTATIONS, companyIri, ontology } from './vocabulary.ts';

/** Which program wrote a set of annotation facts. */
export type Extractor = Fact.Fact['extractor'];

/** An event type the classifier assigns. */
export const EVENT_TYPES = [
  'earnings',
  'guidance',
  'merger-acquisition',
  'analyst-rating',
  'price-target',
  'dividend-buyback',
  'ipo-offering',
  'legal-regulatory',
  'product',
  'management',
  'macro',
  'market-move',
  'crypto',
  'other',
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/** A ticker's sentiment in one article. */
export type TickerSentiment = Sentiment & { readonly ticker: string; readonly name?: string };

/** What the annotation stages concluded about one article. */
export type Annotation = {
  readonly mentions: ReadonlyArray<TickerMention>;
  readonly sentiment?: Sentiment;
  readonly tickers?: ReadonlyArray<TickerSentiment>;
  readonly events?: ReadonlyArray<EventType>;
};

const ONTOLOGY = ontology();

/** The article as an entity: its link is its IRI, so every graph that names it names one node. */
export const articleTerm = (item: TextItem): Fact.EncodedEntityTerm => ({
  kind: 'entity',
  entity: item.link,
  label: item.title,
  type: 'thing',
});

/** The company a ticker names, under its {@link companyIri}. */
export const companyTerm = (ticker: string, name?: string): Fact.EncodedEntityTerm => ({
  kind: 'entity',
  entity: companyIri(ticker),
  label: name ?? ticker,
  type: 'org',
});

/** The outlet as the agent its facts are attributed to. */
export const publisherAgent = (item: Pick<TextItem, 'publisher'>): string => agentIri(item.publisher);

/** An agent (outlet, regulator, exchange) as an entity IRI. */
export const agentIri = (name: string): string => `${Vocab.ENTITY}${encodeURIComponent(name.toLowerCase())}`;

export const literal = (value: string): Fact.LiteralTerm => ({ kind: 'literal', literal: value });

/** One statement: subject, predicate entry, object. */
export type Statement = readonly [subject: Fact.EncodedTerm, predicate: Ontology.Entry, object: Fact.EncodedTerm];

/** Where a graph's statements come from: the item's foreign key as `source`, who published it, and when. */
export type Provenance = {
  readonly source: string;
  readonly agent: string;
  readonly agentLabel: string;
  /** ISO time, the item's own, so a rerun writes the same graph. */
  readonly time: string;
  /** Hash of the item's content. */
  readonly hash: string;
};

/** A text item's provenance. */
export const itemProvenance = (item: TextItem): Provenance => ({
  source: itemSource(item),
  agent: publisherAgent(item),
  agentLabel: item.publisher,
  time: item.published,
  hash: Hash.text(itemText(item)),
});

/**
 * The statements of one named graph, `<source>#<name>`. Deterministic in its input (the item's own date stands in
 * for the record time), so re-deriving an unchanged item writes the same graph.
 */
export const graphOf = (
  provenance: Provenance,
  name: string,
  extractor: Extractor,
  statements: ReadonlyArray<Statement>,
  confidence?: number,
): Fact.Fact[] => {
  const base = {
    id: '',
    factuality: { value: 'CT+', polarity: '+', ...(confidence !== undefined ? { confidence } : {}) },
    attribution: {
      agent: provenance.agent,
      agentLabel: provenance.agentLabel,
      source: provenance.source,
      generatedAtTime: provenance.time,
    },
    recordedAt: provenance.time,
    extractor,
    sourceHash: provenance.hash,
  } satisfies Omit<Fact.Encoded, 'assertion'>;
  return Graph.assign(
    statements.map(([subject, predicate, object]) => ({
      ...base,
      assertion: { subject, predicate: predicate.label, predicateIri: predicate.iri, object },
    })),
    { name: () => `${provenance.source}#${name}`, ontology: ONTOLOGY },
  );
};

const graph = (
  item: TextItem,
  name: string,
  extractor: Extractor,
  statements: ReadonlyArray<Statement>,
  confidence?: number,
): Fact.Fact[] => graphOf(itemProvenance(item), name, extractor, statements, confidence);

/** The article's own record: headline, outlet and date. */
export const articleFacts = (item: TextItem, extractor: Extractor): Fact.Fact[] => {
  const article = articleTerm(item);
  return graph(item, 'article', extractor, [
    [article, ANNOTATIONS.headline, literal(item.title)],
    [
      article,
      ANNOTATIONS.publisher,
      { kind: 'entity', entity: item.publisher.toLowerCase(), label: item.publisher, type: 'org' },
    ],
    [article, ANNOTATIONS.datePublished, literal(item.published)],
  ]);
};

/**
 * The mention index: `article —mentions→ company` and `company —has ticker symbol→ "AAPL"`. Mentions the regex found
 * are certain; the ones the model linked from a company name carry its lower confidence, in a graph of their own.
 */
export const mentionFacts = (
  item: TextItem,
  mentions: ReadonlyArray<TickerMention>,
  extractor: Extractor,
): Fact.Fact[] => {
  const article = articleTerm(item);
  const statements = (found: ReadonlyArray<TickerMention>): Statement[] =>
    found.flatMap(({ ticker, name }) => [
      [article, ANNOTATIONS.mentions, companyTerm(ticker, name)],
      [companyTerm(ticker, name), ANNOTATIONS.tickerSymbol, literal(ticker)],
    ]);
  const exact = mentions.filter(({ via }) => via !== 'llm');
  const linked = mentions.filter(({ via }) => via === 'llm');
  return [
    ...(exact.length > 0 ? graph(item, 'mentions', extractor, statements(exact), 1) : []),
    ...(linked.length > 0 ? graph(item, 'mentions-linked', extractor, statements(linked), 0.8) : []),
  ];
};

const score = (value: number): Fact.LiteralTerm => literal(value.toFixed(2));

/**
 * Sentiment: the article's (`article —has sentiment→ "positive"`, `—has sentiment score→ "0.60"`), and per ticker a
 * node of its own graph that is about the company and expressed in the article, carrying the label and score.
 */
export const sentimentFacts = (
  item: TextItem,
  sentiment: Sentiment,
  tickers: ReadonlyArray<TickerSentiment>,
  extractor: Extractor,
): Fact.Fact[] => {
  const article = articleTerm(item);
  return [
    ...graph(item, 'sentiment', extractor, [
      [article, ANNOTATIONS.sentiment, literal(sentiment.polarity)],
      [article, ANNOTATIONS.sentimentScore, score(sentiment.score)],
    ]),
    ...tickers.flatMap(({ ticker, name, polarity, score: value }) => {
      const node: Fact.EncodedEntityTerm = {
        kind: 'entity',
        entity: 'sentiment',
        label: `${ticker} sentiment`,
        type: 'concept',
      };
      return graph(item, `sentiment#${ticker}`, extractor, [
        [node, ANNOTATIONS.sentimentAbout, companyTerm(ticker, name)],
        [node, ANNOTATIONS.expressedIn, article],
        [node, ANNOTATIONS.sentiment, literal(polarity)],
        [node, ANNOTATIONS.sentimentScore, score(value)],
      ]);
    }),
  ];
};

/** Event types: `article —reports event→ "earnings"`. */
export const eventFacts = (item: TextItem, events: ReadonlyArray<EventType>, extractor: Extractor): Fact.Fact[] =>
  events.length === 0
    ? []
    : graph(
        item,
        'events',
        extractor,
        events.map((event) => [articleTerm(item), ANNOTATIONS.eventType, literal(event)]),
      );
