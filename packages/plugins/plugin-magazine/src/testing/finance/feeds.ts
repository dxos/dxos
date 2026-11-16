//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as FetchHttpClient from 'effect/http/FetchHttpClient';
import * as HttpClient from 'effect/http/HttpClient';
import * as HttpClientRequest from 'effect/http/HttpClientRequest';
import * as HttpClientResponse from 'effect/http/HttpClientResponse';
import * as Schedule from 'effect/Schedule';

import { FeedFetchError } from '../../operations/sources/feed-fetcher.ts';
import { parseFeed } from '../../operations/sources/rss.ts';
import { type NewsItem, fromPost } from './news-item.ts';
import { TICKERS } from './tickers.ts';

/** One feed to poll: an id that names it in the item store, and its URL. */
export type FeedSpec = { readonly id: string; readonly url: string };

/** A date window, as ISO days (`2026-10-17`); `before` is exclusive. */
export type Window = { readonly after: string; readonly before: string };

/**
 * A Google News search feed. Its 100-item cap makes a 30-day query return mostly the last few days, so a month of
 * history is read as one query per week-long window.
 */
export const googleNews = (query: string, window?: Window): FeedSpec => {
  const range = window ? ` after:${window.after} before:${window.before}` : ' when:30d';
  const q = encodeURIComponent(`${query}${range}`).replace(/%20/g, '+');
  return {
    id: `google:${query}${window ? `@${window.after}` : ''}`,
    url: `https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`,
  };
};

/** Yahoo Finance's per-ticker headline feed (the last few days only). */
export const yahooTicker = (ticker: string): FeedSpec => ({
  id: `yahoo:${ticker}`,
  url: `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(ticker.replace('.', '-'))}&region=US&lang=en-US`,
});

/** Outlet feeds that answered when this list was made (Yahoo's `rssindex` and Investing.com did not). */
export const OUTLET_FEEDS: ReadonlyArray<FeedSpec> = [
  { id: 'cnbc:markets', url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html' },
  { id: 'cnbc:earnings', url: 'https://www.cnbc.com/id/15839135/device/rss/rss.html' },
  { id: 'marketwatch:top', url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories' },
  { id: 'marketwatch:pulse', url: 'https://feeds.content.dowjones.io/public/rss/mw_marketpulse' },
  { id: 'nasdaq:markets', url: 'https://www.nasdaq.com/feed/rssoutbound?category=Markets' },
  { id: 'nasdaq:earnings', url: 'https://www.nasdaq.com/feed/rssoutbound?category=Earnings' },
  { id: 'seekingalpha:currents', url: 'https://seekingalpha.com/market_currents.xml' },
];

/** Market-wide topics searched week by week. */
export const TOPICS: ReadonlyArray<string> = [
  'stock market',
  'earnings beat estimates',
  'analyst upgrade downgrade stock',
  'price target stock',
  'merger acquisition deal',
  'Federal Reserve interest rates',
  'IPO',
  'dividend stock buyback',
];

/** The `count` week-long windows ending on `end` (an ISO day), oldest first. */
export const weeklyWindows = (end: string, count: number): Window[] => {
  const day = 24 * 60 * 60 * 1000;
  const last = Date.parse(`${end}T00:00:00Z`) + day;
  return Array.from({ length: count }, (_, index) => {
    const before = last - (count - 1 - index) * 7 * day;
    return {
      after: new Date(before - 7 * day).toISOString().slice(0, 10),
      before: new Date(before).toISOString().slice(0, 10),
    };
  });
};

/** Options for {@link defaultFeeds}. */
export type DefaultFeedsOptions = {
  /** The last day covered (ISO); defaults to today. */
  readonly end?: string;
  /** Week-long windows of topic searches (default 5, about a month). */
  readonly weeks?: number;
  /** How many of {@link TICKERS} get a Google News and a Yahoo feed (default all). */
  readonly tickers?: number;
  /** How many of {@link TOPICS} are searched (default all). */
  readonly topics?: number;
};

/**
 * The feeds a month of finance news is read from: each topic per week, each ticker over the last 30 days (Google
 * News) and its recent Yahoo headlines, and the outlets' own feeds.
 */
export const defaultFeeds = ({
  end = new Date().toISOString().slice(0, 10),
  weeks = 5,
  tickers = TICKERS.length,
  topics = TOPICS.length,
}: DefaultFeedsOptions = {}): FeedSpec[] => {
  const windows = weeklyWindows(end, weeks);
  return [
    ...TOPICS.slice(0, topics).flatMap((topic) => windows.map((window) => googleNews(topic, window))),
    ...TICKERS.slice(0, tickers).flatMap(({ ticker, name }) => [
      googleNews(`${ticker} ${name} stock`),
      yahooTicker(ticker),
    ]),
    ...OUTLET_FEEDS,
  ];
};

// Yahoo answers 404 to a request without a browser user agent.
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)';

/** Fetches and parses one feed into news items. */
export const fetchFeed = (spec: FeedSpec, fetchedAt: string): Effect.Effect<NewsItem[], FeedFetchError> =>
  HttpClientRequest.get(spec.url).pipe(
    HttpClientRequest.setHeader('user-agent', USER_AGENT),
    HttpClient.execute,
    Effect.flatMap(HttpClientResponse.filterStatusOk),
    Effect.flatMap((response) => response.text),
    Effect.timeout('20 seconds'),
    Effect.retry(Schedule.exponential('1 second').pipe(Schedule.upTo({ times: 2 }))),
    Effect.scoped,
    Effect.mapError((cause) => new FeedFetchError({ message: `Fetch failed: ${spec.url}`, cause })),
    Effect.flatMap((xml) =>
      Effect.try({
        try: () => parseFeed(spec.url, xml),
        catch: (cause) => new FeedFetchError({ message: `Unrecognized feed format: ${spec.url}`, cause }),
      }),
    ),
    Effect.map(({ posts }) => posts.flatMap((post) => fromPost(post, spec.id, fetchedAt) ?? [])),
    Effect.provide(FetchHttpClient.layer),
  );
