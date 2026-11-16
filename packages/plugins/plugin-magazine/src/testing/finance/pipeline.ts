//
// Copyright 2026 DXOS.org
//

import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';

import { type AiService } from '@dxos/ai';
import { log } from '@dxos/log';
import {
  DEFAULT_INDEX_BATCH_SIZE,
  FactStore,
  type IndexBatchOptions,
  RDF,
  type SemanticIndexError,
  hashText,
  indexFactsBatch,
} from '@dxos/pipeline-rdf';
import { trim } from '@dxos/util';

import {
  type AnnotateModelOptions,
  classifyEvents,
  classifySentiment,
  lexiconTickers,
  linkTickers,
} from './annotate.ts';
import { type Extractor, articleFacts, eventFacts, mentionFacts, publisherAgent, sentimentFacts } from './facts.ts';
import { type NewsItem, itemSource, itemText } from './news-item.ts';
import { lexiconSentiment } from './sentiment-lexicon.ts';
import { type TickerMention, TICKERS, findTickers, mergeMentions } from './tickers.ts';
import { companyIri, ontology } from './vocabulary.ts';

/** What the annotation stages run. */
export type AnnotateOptions = AnnotateModelOptions & {
  /** Items per classification request (default 40). */
  readonly batchSize?: number;
  /** Link company names to tickers with the model, beyond the regex index (default true). */
  readonly linkNames?: boolean;
  /** `llm` (default) or the deterministic `lexicon` baseline. */
  readonly sentiment?: 'llm' | 'lexicon';
  /** Classify event types with the model (default true). */
  readonly events?: boolean;
};

/** Options for {@link run}. */
export type FinancePipelineOptions = {
  /** Fact extraction; `false` skips it. */
  readonly extract?: IndexBatchOptions | false;
  /** Mentions, sentiment and events; `false` skips them. */
  readonly annotate?: AnnotateOptions | false;
  /** Batches in flight at once (default 4). */
  readonly concurrency?: number;
};

/** What a run did. */
export type FinancePipelineSummary = {
  readonly items: number;
  /** Items fact extraction indexed this run (unchanged ones are skipped by their cursor). */
  readonly extracted: number;
  readonly extractedFacts: number;
  /** Items annotated this run. */
  readonly annotated: number;
  readonly annotationFacts: number;
  /** Batches whose model call failed; their items are retried on the next run. */
  readonly failedBatches: number;
};

/** Rules extraction adds for news headlines. */
export const NEWS_RULES: ReadonlyArray<string> = [
  'Each message is a finance news headline, sometimes followed by a summary, and its author is the outlet that published it. State what the news says about companies, people, markets and the economy as facts about them, not as things the outlet says.',
  'Name a company by its usual name ("Apple", not "AAPL" or "Apple Inc. (NASDAQ: AAPL)"), and when the text gives its ticker add "has ticker symbol" with the symbol as a literal.',
  'Keep figures in the object as written, with units and periods ("$94.9 billion", "Q3 2026", "$250 price target"), and put the date the figure refers to in validFrom when the text names it.',
  'Skip opinion framing with no fact in it ("Is X a buy?", "3 stocks to watch"), and questions in headlines.',
];

/** The listed companies as entities the extractor links names to, so its facts and the mention index share nodes. */
export const KNOWN_COMPANIES: ReadonlyArray<RDF.KnownEntity> = TICKERS.map(({ ticker, name, aliases }) => ({
  iri: companyIri(ticker),
  label: name,
  aliases: [ticker, ...(aliases ?? [])],
  type: 'org',
}));

/** The document fact extraction reads for an item. */
export const extractDocument = (item: NewsItem): RDF.ExtractDocument => ({
  text: itemText(item),
  source: itemSource(item),
  author: item.publisher,
  agent: publisherAgent(item),
  ...(item.published ? { date: item.published } : {}),
});

// Bumped when the annotation stages change what they write, so a rerun re-annotates.
const ANNOTATION_VERSION = '1';

const annotationCursor = (item: NewsItem): string => `${itemSource(item)}#annotations`;
const annotationHash = (item: NewsItem, options: AnnotateOptions): string =>
  hashText(
    `${ANNOTATION_VERSION}|${options.linkNames ?? true}|${options.sentiment ?? 'llm'}|${options.events ?? true}|${itemText(item)}`,
  );

/**
 * Fact extraction over items, a batch at a time through {@link indexFactsBatch} with the finance ontology, the news
 * rules and the known companies. Items already indexed are skipped by their cursor.
 */
export const extractFacts = (
  items: ReadonlyArray<NewsItem>,
  options: IndexBatchOptions = {},
  concurrency = 4,
): Effect.Effect<{ extracted: number; facts: number; failed: number }, never, FactStore | AiService.AiService> =>
  Effect.gen(function* () {
    const { batchSize = DEFAULT_INDEX_BATCH_SIZE, ...extract } = options;
    const extractOptions = {
      ontology: ontology(),
      entities: KNOWN_COMPANIES,
      ...extract,
      rules: [...NEWS_RULES, ...(extract.rules ?? [])],
    };
    const results = yield* Effect.forEach(
      Array.chunksOf(items.map(extractDocument), batchSize),
      (docs) =>
        indexFactsBatch(docs, extractOptions).pipe(
          Effect.map((indexed) => ({
            extracted: indexed.length,
            facts: indexed.reduce((sum, { facts }) => sum + facts.length, 0),
            failed: 0,
          })),
          Effect.catch((error: SemanticIndexError) =>
            Effect.sync(() => {
              log.warn('extraction batch failed', { error: String(error) });
              return { extracted: 0, facts: 0, failed: 1 };
            }),
          ),
        ),
      { concurrency },
    );
    return {
      extracted: results.reduce((sum, { extracted }) => sum + extracted, 0),
      facts: results.reduce((sum, { facts }) => sum + facts, 0),
      failed: results.reduce((sum, { failed }) => sum + failed, 0),
    };
  });

const extractorFor = (stage: string, model: string): Extractor => ({
  id: `finance-${stage}`,
  model,
  version: ANNOTATION_VERSION,
});

/**
 * The annotation stages over one batch: the article record, the mention index (regex, then model linking), sentiment
 * (model or lexicon) and event types. A batch is committed whole, its cursors advanced only when every model call
 * answered, so a failed batch is retried on the next run.
 */
const annotateBatch = (
  items: ReadonlyArray<NewsItem>,
  options: AnnotateOptions,
): Effect.Effect<
  { annotated: number; facts: number; failed: number },
  SemanticIndexError,
  FactStore | AiService.AiService
> =>
  Effect.gen(function* () {
    const store = yield* FactStore;
    const model = 'claude-haiku-5-5';
    const found = items.map((item) => findTickers(itemText(item)));
    const linked = options.linkNames === false ? items.map(() => []) : yield* linkTickers(items, options);
    if (!linked) {
      return { annotated: 0, facts: 0, failed: 1 };
    }
    const mentions: TickerMention[][] = found.map((mentions, index) => mergeMentions(mentions, linked[index] ?? []));
    const modelSentiment =
      options.sentiment === 'lexicon' ? undefined : yield* classifySentiment(items, mentions, options);
    if (options.sentiment !== 'lexicon' && !modelSentiment) {
      return { annotated: 0, facts: 0, failed: 1 };
    }
    const events = options.events === false ? items.map(() => []) : yield* classifyEvents(items, options);
    if (!events) {
      return { annotated: 0, facts: 0, failed: 1 };
    }

    const facts = items.flatMap((item, index) => {
      const lexicon = lexiconSentiment(itemText(item));
      const sentiment = modelSentiment?.[index] ?? {
        sentiment: lexicon,
        tickers: lexiconTickers(mentions[index], lexicon),
      };
      const sentimentModel = modelSentiment?.[index] ? model : 'lexicon';
      return [
        ...articleFacts(item, extractorFor('article', 'feed')),
        ...mentionFacts(
          item,
          mentions[index],
          extractorFor('mentions', options.linkNames === false ? 'regex' : `regex+${model}`),
        ),
        ...sentimentFacts(item, sentiment.sentiment, sentiment.tickers, extractorFor('sentiment', sentimentModel)),
        ...eventFacts(item, events[index] ?? [], extractorFor('events', model)),
      ];
    });
    yield* store.putFacts(facts);
    for (const item of items) {
      yield* store.setCursor(annotationCursor(item), annotationHash(item, options));
    }
    return { annotated: items.length, facts: facts.length, failed: 0 };
  });

/** The annotation stages over items, skipping the ones already annotated with the same options. */
export const annotate = (
  items: ReadonlyArray<NewsItem>,
  options: AnnotateOptions = {},
  concurrency = 4,
): Effect.Effect<
  { annotated: number; facts: number; failed: number },
  SemanticIndexError,
  FactStore | AiService.AiService
> =>
  Effect.gen(function* () {
    const store = yield* FactStore;
    const pending: NewsItem[] = [];
    for (const item of items) {
      if ((yield* store.cursor(annotationCursor(item))) !== annotationHash(item, options)) {
        pending.push(item);
      }
    }
    const results = yield* Effect.forEach(
      Array.chunksOf(pending, options.batchSize ?? 40),
      (batch) => annotateBatch(batch, options),
      { concurrency },
    );
    return {
      annotated: results.reduce((sum, { annotated }) => sum + annotated, 0),
      facts: results.reduce((sum, { facts }) => sum + facts, 0),
      failed: results.reduce((sum, { failed }) => sum + failed, 0),
    };
  });

/** Runs fact extraction and the annotation stages over the items into the {@link FactStore}. Resumable. */
export const run = (
  items: ReadonlyArray<NewsItem>,
  { extract = {}, annotate: annotateOptions = {}, concurrency = 4 }: FinancePipelineOptions = {},
): Effect.Effect<FinancePipelineSummary, SemanticIndexError, FactStore | AiService.AiService> =>
  Effect.gen(function* () {
    const extracted =
      extract === false ? { extracted: 0, facts: 0, failed: 0 } : yield* extractFacts(items, extract, concurrency);
    const annotated =
      annotateOptions === false
        ? { annotated: 0, facts: 0, failed: 0 }
        : yield* annotate(items, annotateOptions, concurrency);
    return {
      items: items.length,
      extracted: extracted.extracted,
      extractedFacts: extracted.facts,
      annotated: annotated.annotated,
      annotationFacts: annotated.facts,
      failedBatches: extracted.failed + annotated.failed,
    };
  });

/** A one-line description of a pipeline configuration, for the run log. */
export const describe = (options: FinancePipelineOptions): string =>
  trim`
    extract=${options.extract === false ? 'off' : `batch ${options.extract?.batchSize ?? DEFAULT_INDEX_BATCH_SIZE}, thinking ${options.extract?.thinking ?? true}`}
    annotate=${options.annotate === false ? 'off' : `sentiment ${options.annotate?.sentiment ?? 'llm'}, link ${options.annotate?.linkNames ?? true}, events ${options.annotate?.events ?? true}`}
  `.replace(/\n/g, ' ');
