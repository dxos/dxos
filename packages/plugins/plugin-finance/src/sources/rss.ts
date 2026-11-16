//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Obj } from '@dxos/echo';
import { parseFeed } from '@dxos/plugin-magazine/FeedParser';
import * as Subscription from '@dxos/plugin-magazine/Subscription';

import { TICKERS } from '../pipeline/tickers.ts';
import { BROWSER_USER_AGENT, SourceError, TOOL_USER_AGENT, getText } from './http.ts';
import { cleanSummary, hostOf, splitPublisher, toIsoDate } from './text-item.ts';

/** The text sources: each writes a feed of its own. */
export type TextFamily = 'news' | 'press-releases' | 'central-banks' | 'reddit' | 'crypto';

/** One RSS/Atom feed to poll. */
export type FeedSpec = {
  /** Names the feed in logs. */
  readonly id: string;
  readonly url: string;
  readonly family: TextFamily;
  /** The publisher every item gets (a bank, a subreddit); otherwise from the item. */
  readonly publisher?: string;
  readonly userAgent?: string;
};

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
    family: 'news',
  };
};

/** Yahoo Finance's per-ticker headline feed (the last few days only). */
export const yahooTicker = (ticker: string): FeedSpec => ({
  id: `yahoo:${ticker}`,
  url: `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(ticker.replace('.', '-'))}&region=US&lang=en-US`,
  family: 'news',
});

/**
 * Feeds that answered without a key when this list was made. Dropped: Yahoo's `rssindex` (404), Investing.com
 * (timeout), GlobeNewswire (403), Business Wire (empty), BLS (403).
 */
export const FIXED_FEEDS: ReadonlyArray<FeedSpec> = [
  { id: 'cnbc:markets', url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', family: 'news' },
  { id: 'cnbc:earnings', url: 'https://www.cnbc.com/id/15839135/device/rss/rss.html', family: 'news' },
  { id: 'marketwatch:top', url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories', family: 'news' },
  { id: 'marketwatch:pulse', url: 'https://feeds.content.dowjones.io/public/rss/mw_marketpulse', family: 'news' },
  { id: 'nasdaq:markets', url: 'https://www.nasdaq.com/feed/rssoutbound?category=Markets', family: 'news' },
  { id: 'nasdaq:earnings', url: 'https://www.nasdaq.com/feed/rssoutbound?category=Earnings', family: 'news' },
  { id: 'seekingalpha:currents', url: 'https://seekingalpha.com/market_currents.xml', family: 'news' },
  {
    id: 'prnewswire:financial',
    url: 'https://www.prnewswire.com/rss/financial-services-latest-news/financial-services-latest-news-list.rss',
    family: 'press-releases',
    publisher: 'PR Newswire',
  },
  {
    id: 'prnewswire:all',
    url: 'https://www.prnewswire.com/rss/news-releases-list.rss',
    family: 'press-releases',
    publisher: 'PR Newswire',
  },
  {
    id: 'fed:press',
    url: 'https://www.federalreserve.gov/feeds/press_all.xml',
    family: 'central-banks',
    publisher: 'Federal Reserve',
  },
  {
    id: 'fed:speeches',
    url: 'https://www.federalreserve.gov/feeds/speeches.xml',
    family: 'central-banks',
    publisher: 'Federal Reserve',
  },
  { id: 'ecb:press', url: 'https://www.ecb.europa.eu/rss/press.html', family: 'central-banks', publisher: 'ECB' },
  {
    id: 'boe:news',
    url: 'https://www.bankofengland.co.uk/rss/news',
    family: 'central-banks',
    publisher: 'Bank of England',
  },
  { id: 'bea:releases', url: 'https://apps.bea.gov/rss/rss.xml', family: 'central-banks', publisher: 'BEA' },
  { id: 'coindesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', family: 'crypto', publisher: 'CoinDesk' },
  { id: 'theblock', url: 'https://www.theblock.co/rss.xml', family: 'crypto', publisher: 'The Block' },
  ...['investing', 'stocks', 'SecurityAnalysis', 'wallstreetbets'].map((subreddit): FeedSpec => ({
    id: `reddit:${subreddit}`,
    url: `https://www.reddit.com/r/${subreddit}/top/.rss?t=month&limit=100`,
    family: 'reddit',
    publisher: `r/${subreddit}`,
    userAgent: TOOL_USER_AGENT,
  })),
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

/** Options for {@link feedSpecs}. */
export type FeedSpecsOptions = {
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
 * Every text feed: each topic per week, each ticker over the last 30 days (Google News) and its recent Yahoo
 * headlines, and the outlets', wires', banks', Reddit's and crypto sites' own feeds.
 */
export const feedSpecs = ({
  end = new Date().toISOString().slice(0, 10),
  weeks = 5,
  tickers = TICKERS.length,
  topics = TOPICS.length,
}: FeedSpecsOptions = {}): FeedSpec[] => {
  const windows = weeklyWindows(end, weeks);
  return [
    ...TOPICS.slice(0, topics).flatMap((topic) => windows.map((window) => googleNews(topic, window))),
    ...TICKERS.slice(0, tickers).flatMap(({ ticker, name }) => [
      googleNews(`${ticker} ${name} stock`),
      yahooTicker(ticker),
    ]),
    ...FIXED_FEEDS,
  ];
};

/**
 * A parsed feed post as the post a finance feed stores: keyed by the feed's host and the item's guid (else link), the
 * publisher split off a Google News title or taken from the spec or the link's host, the summary cleaned to plain
 * text, and the publication time (the fetch time when the feed gives none). Undefined for an item without a title or
 * link.
 */
export const toPost = (post: Subscription.Post, spec: FeedSpec, fetchedAt: string): Subscription.Post | undefined => {
  if (!post.title || !post.link) {
    return undefined;
  }
  const google = spec.id.startsWith('google:');
  const { headline, publisher } = google
    ? splitPublisher(post.title)
    : { headline: post.title.trim(), publisher: undefined };
  const outlet = spec.publisher ?? publisher ?? hostOf(post.link) ?? 'unknown';
  const summary = cleanSummary(post.description ?? post.content, headline, outlet);
  return Subscription.makePost({
    [Obj.Meta]: { keys: [{ source: hostOf(spec.url) ?? spec.id, id: post.guid ?? post.link }] },
    title: headline,
    link: post.link,
    ...(summary ? { description: summary } : {}),
    author: outlet,
    published: toIsoDate(post.published) ?? fetchedAt,
    ...(post.guid ? { guid: post.guid } : {}),
  });
};

/** Fetches and parses one feed into finance posts. */
export const fetchFeed = (spec: FeedSpec, fetchedAt: string): Effect.Effect<Subscription.Post[], SourceError> =>
  getText(spec.url, spec.userAgent ?? BROWSER_USER_AGENT).pipe(
    Effect.flatMap((xml) =>
      Effect.try({
        try: () => parseFeed(spec.url, xml),
        catch: (cause) => new SourceError({ message: `Unrecognized feed format: ${spec.url}`, cause }),
      }),
    ),
    Effect.map(({ posts }) => posts.flatMap((post) => toPost(post, spec, fetchedAt) ?? [])),
  );
