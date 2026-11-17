//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Obj } from '@dxos/echo';
import * as FeedParser from '@dxos/plugin-magazine/FeedParser';

import { lexiconSentiment } from '../pipeline/sentiment-lexicon.ts';
import { type FeedSpec, FIXED_FEEDS, feedSpecs, googleNews, toPost, weeklyWindows } from './rss.ts';
import { cleanSummary, fromPost, splitPublisher, storyKey } from './text-item.ts';

const GOOGLE_NEWS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>"AAPL" - Google News</title>
<item>
  <title>Apple beats Q4 estimates as iPhone sales jump - Reuters</title>
  <link>https://news.google.com/rss/articles/CBMi1?oc=5</link>
  <guid isPermaLink="false">CBMi1</guid>
  <pubDate>Thu, 29 Oct 2026 21:05:00 GMT</pubDate>
  <description>&lt;a href="https://news.google.com/rss/articles/CBMi1?oc=5" target="_blank"&gt;Apple beats Q4 estimates as iPhone sales jump&lt;/a&gt;&amp;nbsp;&amp;nbsp;&lt;font color="#6f6f6f"&gt;Reuters&lt;/font&gt;</description>
  <source url="https://www.reuters.com">Reuters</source>
</item>
<item>
  <title>Stocks slide as yields rise - Investor's Business Daily</title>
  <link>https://news.google.com/rss/articles/CBMi2?oc=5</link>
  <guid isPermaLink="false">CBMi2</guid>
</item>
</channel></rss>`;

const FED = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>FRB: Press Release</title>
<item>
  <title>Federal Reserve issues FOMC statement</title>
  <link>https://www.federalreserve.gov/newsevents/pressreleases/monetary20261028a.htm</link>
  <description>The Committee decided to lower the target range for the federal funds rate by 1/4 percentage point.</description>
  <pubDate>Wed, 28 Oct 2026 18:00:00 GMT</pubDate>
</item>
</channel></rss>`;

const FETCHED = '2026-11-16T00:00:00.000Z';
const GOOGLE: FeedSpec = googleNews('AAPL Apple stock');
const FED_SPEC = FIXED_FEEDS.find(({ id }) => id === 'fed:press');

const posts = (spec: FeedSpec, xml: string) =>
  FeedParser.parseFeed(spec.url, xml).posts.flatMap((post) => toPost(post, spec, FETCHED) ?? []);

describe('feed posts', () => {
  test('Google News: keyed by guid, outlet split off the title, redundant description dropped', () => {
    const [first, second] = posts(GOOGLE, GOOGLE_NEWS);
    expect(Obj.getMeta(first).keys).toEqual([{ source: 'news.google.com', id: 'CBMi1' }]);
    expect(first).toMatchObject({
      title: 'Apple beats Q4 estimates as iPhone sales jump',
      author: 'Reuters',
      published: '2026-10-29T21:05:00.000Z',
    });
    expect(first.description).toBeUndefined();
    // No date in the feed: the fetch time stands in.
    expect(second).toMatchObject({ author: "Investor's Business Daily", published: FETCHED });
    expect(fromPost(first)).toEqual({
      key: { source: 'news.google.com', id: 'CBMi1' },
      title: 'Apple beats Q4 estimates as iPhone sales jump',
      link: 'https://news.google.com/rss/articles/CBMi1?oc=5',
      publisher: 'Reuters',
      published: '2026-10-29T21:05:00.000Z',
    });
  });

  test('an institution feed keeps its summary and names the institution', () => {
    expect(FED_SPEC).toBeDefined();
    const [post] = FED_SPEC ? posts(FED_SPEC, FED) : [];
    expect(Obj.getMeta(post).keys[0].source).toBe('federalreserve.gov');
    expect(post).toMatchObject({
      author: 'Federal Reserve',
      description:
        'The Committee decided to lower the target range for the federal funds rate by 1/4 percentage point.',
    });
  });

  test('helpers', () => {
    expect(splitPublisher('No outlet here')).toEqual({ headline: 'No outlet here' });
    expect(cleanSummary('[Some headline](https://x) Reuters', 'Some headline', 'Reuters')).toBeUndefined();
    expect(cleanSummary('<p>Shares <b>rose</b> 5% after the report.</p>', 'Other', 'X')).toBe(
      'Shares rose 5% after the report.',
    );
    expect(storyKey({ title: 'Apple Beats Q4 Estimates, as iPhone sales jump', publisher: 'Reuters' })).toBe(
      storyKey({ title: 'Apple beats Q4 estimates as iPhone sales jump', publisher: 'reuters' }),
    );
  });

  test('a month of feeds: weekly topic windows, per-ticker searches, then the fixed feeds', () => {
    expect(weeklyWindows('2026-11-15', 2)).toEqual([
      { after: '2026-11-02', before: '2026-11-09' },
      { after: '2026-11-09', before: '2026-11-16' },
    ]);
    expect(googleNews('stock market', { after: '2026-11-02', before: '2026-11-09' }).url).toBe(
      'https://news.google.com/rss/search?q=stock+market+after%3A2026-11-02+before%3A2026-11-09&hl=en-US&gl=US&ceid=US:en',
    );
    const specs = feedSpecs({ end: '2026-11-15', weeks: 2, tickers: 1, topics: 1 });
    expect(specs.map(({ id }) => id).slice(0, 4)).toEqual([
      'google:stock market@2026-11-02',
      'google:stock market@2026-11-09',
      'google:AAPL Apple stock',
      'yahoo:AAPL',
    ]);
    expect(specs).toHaveLength(4 + FIXED_FEEDS.length);
  });
});

describe('lexiconSentiment', () => {
  test('scores headline direction', () => {
    expect(lexiconSentiment('Apple beats estimates as iPhone sales jump').polarity).toBe('positive');
    expect(lexiconSentiment('Intel shares plunge after guidance cut').polarity).toBe('negative');
    expect(lexiconSentiment('Apple to hold annual meeting in March')).toEqual({ polarity: 'neutral', score: 0 });
    expect(lexiconSentiment('Tesla did not miss estimates').polarity).toBe('positive');
  });
});
