//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from 'effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { AiService, AiUsage } from '@dxos/ai';
import { log } from '@dxos/log';
import { DEFAULT_MODEL } from '@dxos/pipeline-rdf';
import { trim } from '@dxos/util';

import { EVENT_TYPES, type EventType, type TickerSentiment } from './facts.ts';
import { type NewsItem } from './news-item.ts';
import { type Sentiment, polarityOf } from './sentiment-lexicon.ts';
import { type TickerMention, canonicalTicker } from './tickers.ts';

/** Model options for the annotation stages. */
export type AnnotateModelOptions = {
  readonly model?: string;
  /** Classification needs no reasoning, so it runs without thinking unless asked. */
  readonly thinking?: boolean;
};

const Polarity = Schema.Literals(['positive', 'negative', 'neutral']);

const LinkPayload = Schema.Struct({
  items: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      companies: Schema.Array(Schema.Struct({ name: Schema.String, ticker: Schema.String })),
    }),
  ),
});

const SentimentPayload = Schema.Struct({
  items: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      sentiment: Polarity,
      score: Schema.Number,
      tickers: Schema.Array(Schema.Struct({ ticker: Schema.String, sentiment: Polarity, score: Schema.Number })),
    }),
  ),
});

const EventPayload = Schema.Struct({
  items: Schema.Array(Schema.Struct({ id: Schema.String, events: Schema.Array(Schema.String) })),
});

/** The headline lines a prompt lists, each tagged `a1`, `a2`, … so the answer can cite them. */
const listing = (items: ReadonlyArray<NewsItem>, extra?: (item: NewsItem) => string): string =>
  items
    .map(
      (item, index) =>
        `[a${index + 1}] ${extra ? `${extra(item)} ` : ''}${item.title}${item.summary ? ` — ${item.summary.slice(0, 400)}` : ''}`,
    )
    .join('\n');

const indexOf = (id: string): number => Number(/\d+/.exec(id)?.[0] ?? 0) - 1;

/** Runs a classification prompt, attributed to `stage`; a failed generation yields undefined so the batch is retried later. */
const generate = <A, E>(
  stage: string,
  request: Effect.Effect<{ readonly value: A }, E, LanguageModel.LanguageModel>,
  options: AnnotateModelOptions,
): Effect.Effect<A | undefined, never, AiService.AiService> =>
  request.pipe(
    Effect.provide(
      AiService.languageModel(options.model ?? DEFAULT_MODEL, { thinking: options.thinking ?? false }).pipe(
        Layer.orDie,
      ),
    ),
    AiUsage.withStage(stage),
    Effect.map(({ value }) => value),
    Effect.catch((error) =>
      Effect.sync(() => {
        log.warn('annotation failed', { stage, error: String(error) });
        return undefined;
      }),
    ),
  );

/**
 * LLM ticker linking: the listed companies each headline names, with their primary US ticker, for names the regex
 * index does not know. Returns one list per item, in order; undefined when the model call failed.
 */
export const linkTickers = (
  items: ReadonlyArray<NewsItem>,
  options: AnnotateModelOptions = {},
): Effect.Effect<Array<Array<{ ticker: string; name: string }>> | undefined, never, AiService.AiService> =>
  Effect.gen(function* () {
    const payload = yield* generate(
      'link-tickers',
      LanguageModel.generateObject({
        schema: LinkPayload,
        prompt: trim`
        For each finance news headline below, list every publicly traded company it names, with the company's
        primary ticker symbol on a US exchange (NYSE or Nasdaq, including ADRs). Leave out private companies,
        indexes, ETFs, funds, currencies, crypto coins, people and government bodies, and leave out a company with
        no US listing. Return one entry per headline, with its id (a1, a2, …), and an empty list when it names none.

        ${listing(items)}
      `,
      }),
      options,
    );
    if (!payload) {
      return undefined;
    }
    const result = items.map((): Array<{ ticker: string; name: string }> => []);
    for (const { id, companies } of payload.items) {
      result[indexOf(id)]?.push(...companies);
    }
    return result;
  });

/** Per-article and per-ticker sentiment from the model. */
export type ModelSentiment = { readonly sentiment: Sentiment; readonly tickers: TickerSentiment[] };

const clamp = (value: number): number => Math.max(-1, Math.min(1, value));

/**
 * LLM sentiment: how good or bad each headline is for investors, overall and for each ticker it mentions. Returns one
 * result per item, in order (undefined for an item the model skipped); undefined when the call failed.
 */
export const classifySentiment = (
  items: ReadonlyArray<NewsItem>,
  mentions: ReadonlyArray<ReadonlyArray<TickerMention>>,
  options: AnnotateModelOptions = {},
): Effect.Effect<Array<ModelSentiment | undefined> | undefined, never, AiService.AiService> =>
  Effect.gen(function* () {
    const position = new Map(items.map((item, index) => [item, index]));
    const payload = yield* generate(
      'sentiment',
      LanguageModel.generateObject({
        schema: SentimentPayload,
        prompt: trim`
        Rate the investor sentiment of each finance news headline below: for the article as a whole, and for each
        ticker listed before it. "positive" is good news for holders (beats, upgrades, raised guidance, gains,
        favourable deals), "negative" is bad news (misses, downgrades, losses, probes, cuts), "neutral" is factual,
        mixed or directionless. Score from -1 (very negative) to 1 (very positive), 0 for neutral. Return one entry
        per headline with its id (a1, a2, …), and one ticker entry per listed ticker.

        ${listing(items, (item) => {
          const tickers = mentions[position.get(item) ?? -1] ?? [];
          return tickers.length > 0
            ? `(tickers: ${tickers.map(({ ticker }) => ticker).join(', ')})`
            : '(tickers: none)';
        })}
      `,
      }),
      options,
    );
    if (!payload) {
      return undefined;
    }
    const result: Array<ModelSentiment | undefined> = items.map(() => undefined);
    for (const entry of payload.items) {
      const index = indexOf(entry.id);
      if (index < 0 || index >= items.length) {
        continue;
      }
      const known = new Map(mentions[index].map((mention) => [mention.ticker, mention]));
      const article = clamp(entry.score);
      result[index] = {
        sentiment: { polarity: entry.sentiment, score: article },
        tickers: entry.tickers.flatMap(({ ticker, sentiment, score }) => {
          const mention = known.get(canonicalTicker(ticker));
          return mention
            ? [
                {
                  ticker: mention.ticker,
                  ...(mention.name ? { name: mention.name } : {}),
                  polarity: sentiment,
                  score: clamp(score),
                },
              ]
            : [];
        }),
      };
    }
    return result;
  });

const isEventType = (value: string): value is EventType => EVENT_TYPES.some((type) => type === value);

/** LLM event classification: the event types each headline reports. Undefined when the call failed. */
export const classifyEvents = (
  items: ReadonlyArray<NewsItem>,
  options: AnnotateModelOptions = {},
): Effect.Effect<EventType[][] | undefined, never, AiService.AiService> =>
  Effect.gen(function* () {
    const payload = yield* generate(
      'classify-events',
      LanguageModel.generateObject({
        schema: EventPayload,
        prompt: trim`
        Classify the event each finance news headline below reports, using only these types: ${EVENT_TYPES.join(', ')}.
        "market-move" is a price move with no other cause named; "macro" is rates, inflation, jobs, GDP or policy.
        A headline may report several; use "other" only when none fits. Return one entry per headline with its id
        (a1, a2, …).

        ${listing(items)}
      `,
      }),
      options,
    );
    if (!payload) {
      return undefined;
    }
    const result = items.map((): EventType[] => []);
    for (const { id, events } of payload.items) {
      result[indexOf(id)]?.push(...events.filter(isEventType));
    }
    return result;
  });

/** The lexicon's sentiment for a ticker mention, from the article text around it. */
export const lexiconTickers = (mentions: ReadonlyArray<TickerMention>, sentiment: Sentiment): TickerSentiment[] =>
  mentions.map(({ ticker, name }) => ({
    ticker,
    ...(name ? { name } : {}),
    polarity: polarityOf(sentiment.score),
    score: sentiment.score,
  }));
