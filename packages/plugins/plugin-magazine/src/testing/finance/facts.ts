//
// Copyright 2026 DXOS.org
//

import { RDF, hashText } from '@dxos/pipeline-rdf';

import { type NewsItem, itemSource, itemText } from './news-item.ts';
import { type Sentiment } from './sentiment-lexicon.ts';
import { type TickerMention } from './tickers.ts';
import { ANNOTATIONS, companyIri, ontology } from './vocabulary.ts';

/** Which program wrote a set of annotation facts. */
export type Extractor = RDF.Fact['extractor'];

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
export const articleTerm = (item: NewsItem): RDF.EntityTerm => ({
  kind: 'entity',
  entity: item.link,
  label: item.title,
  type: 'thing',
});

/** The company a ticker names, under its {@link companyIri}. */
export const companyTerm = (ticker: string, name?: string): RDF.EntityTerm => ({
  kind: 'entity',
  entity: companyIri(ticker),
  label: name ?? ticker,
  type: 'org',
});

/** The outlet as the agent its facts are attributed to. */
export const publisherAgent = (item: Pick<NewsItem, 'publisher'>): string =>
  `${RDF.Vocab.ENTITY}${encodeURIComponent(item.publisher.toLowerCase())}`;

const literal = (value: string): RDF.LiteralTerm => ({ kind: 'literal', literal: value });

type Statement = readonly [subject: RDF.Term, predicate: RDF.Ontology.Entry, object: RDF.Term];

/**
 * The statements of one named graph about an article. Deterministic in its input (the article's own date stands in
 * for the record time), so re-annotating an unchanged article writes the same graph.
 */
const graph = (
  item: NewsItem,
  name: string,
  extractor: Extractor,
  statements: ReadonlyArray<Statement>,
  confidence?: number,
): RDF.Fact[] => {
  const time = item.published ?? item.fetchedAt;
  const base = {
    id: '',
    factuality: { value: 'CT+', polarity: '+', ...(confidence !== undefined ? { confidence } : {}) },
    attribution: {
      agent: publisherAgent(item),
      agentLabel: item.publisher,
      source: itemSource(item),
      generatedAtTime: time,
    },
    recordedAt: time,
    extractor,
    sourceHash: hashText(itemText(item)),
  } satisfies Omit<RDF.Fact, 'assertion'>;
  return RDF.Graph.assign(
    statements.map(([subject, predicate, object]) => ({
      ...base,
      assertion: { subject, predicate: predicate.label, predicateIri: predicate.iri, object },
    })),
    { name: () => `${itemSource(item)}#${name}`, ontology: ONTOLOGY },
  );
};

/** The article's own record: headline, outlet and date. */
export const articleFacts = (item: NewsItem, extractor: Extractor): RDF.Fact[] => {
  const article = articleTerm(item);
  return graph(item, 'article', extractor, [
    [article, ANNOTATIONS.headline, literal(item.title)],
    [
      article,
      ANNOTATIONS.publisher,
      { kind: 'entity', entity: item.publisher.toLowerCase(), label: item.publisher, type: 'org' },
    ],
    ...(item.published ? [[article, ANNOTATIONS.datePublished, literal(item.published)] as const] : []),
  ]);
};

/**
 * The mention index: `article —mentions→ company` and `company —has ticker symbol→ "AAPL"`. Mentions the regex found
 * are certain; the ones the model linked from a company name carry its lower confidence, in a graph of their own.
 */
export const mentionFacts = (
  item: NewsItem,
  mentions: ReadonlyArray<TickerMention>,
  extractor: Extractor,
): RDF.Fact[] => {
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

const score = (value: number): RDF.LiteralTerm => literal(value.toFixed(2));

/**
 * Sentiment: the article's (`article —has sentiment→ "positive"`, `—has sentiment score→ "0.60"`), and per ticker a
 * node of its own graph that is about the company and expressed in the article, carrying the label and score.
 */
export const sentimentFacts = (
  item: NewsItem,
  sentiment: Sentiment,
  tickers: ReadonlyArray<TickerSentiment>,
  extractor: Extractor,
): RDF.Fact[] => {
  const article = articleTerm(item);
  return [
    ...graph(item, 'sentiment', extractor, [
      [article, ANNOTATIONS.sentiment, literal(sentiment.polarity)],
      [article, ANNOTATIONS.sentimentScore, score(sentiment.score)],
    ]),
    ...tickers.flatMap(({ ticker, name, polarity, score: value }) => {
      const node: RDF.EntityTerm = {
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
export const eventFacts = (item: NewsItem, events: ReadonlyArray<EventType>, extractor: Extractor): RDF.Fact[] =>
  events.length === 0
    ? []
    : graph(
        item,
        'events',
        extractor,
        events.map((event) => [articleTerm(item), ANNOTATIONS.eventType, literal(event)]),
      );
