//
// Copyright 2026 DXOS.org
//

import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import { parseFeed } from '../../operations/sources/rss.ts';
import { defaultFeeds, googleNews, weeklyWindows } from './feeds.ts';
import { ItemStore } from './item-store.ts';
import { type NewsItem, cleanSummary, fromPost, splitPublisher, storyKey } from './news-item.ts';
import { lexiconSentiment } from './sentiment-lexicon.ts';

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
  <pubDate>Fri, 30 Oct 2026 14:00:00 GMT</pubDate>
</item>
</channel></rss>`;

const YAHOO = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>Yahoo! Finance: AAPL News</title>
<item>
  <description>Analysts at Morgan Stanley raised their price target to $300, citing services growth.</description>
  <guid isPermaLink="false">bf8184e9</guid>
  <link>https://finance.yahoo.com/news/apple-price-target-1.html</link>
  <pubDate>Mon, 16 Nov 2026 07:46:05 +0000</pubDate>
  <title>Morgan Stanley lifts Apple price target</title>
</item>
</channel></rss>`;

const FETCHED = '2026-11-16T00:00:00.000Z';
const items = (feed: string, xml: string): NewsItem[] =>
  parseFeed('https://example.com/feed', xml).posts.flatMap((post) => fromPost(post, feed, FETCHED) ?? []);

describe('feed parsing', () => {
  test('Google News: splits the outlet off the title and drops the description that only repeats it', () => {
    const [first, second] = items('google:AAPL', GOOGLE_NEWS);
    expect(first).toMatchObject({
      title: 'Apple beats Q4 estimates as iPhone sales jump',
      publisher: 'Reuters',
      published: '2026-10-29T21:05:00.000Z',
      feed: 'google:AAPL',
    });
    expect(first.summary).toBeUndefined();
    expect(first.id).toMatch(/^[0-9a-f]{16}$/);
    expect(second.publisher).toBe("Investor's Business Daily");
  });

  test('outlet feeds keep the summary and name the outlet by host', () => {
    const [item] = items('yahoo:AAPL', YAHOO);
    expect(item).toMatchObject({
      title: 'Morgan Stanley lifts Apple price target',
      summary: 'Analysts at Morgan Stanley raised their price target to $300, citing services growth.',
      publisher: 'finance.yahoo.com',
    });
  });

  test('helpers', () => {
    expect(splitPublisher('No outlet here')).toEqual({ headline: 'No outlet here' });
    expect(cleanSummary('[Some headline](https://x) Reuters', 'Some headline', 'Reuters')).toBeUndefined();
    expect(cleanSummary('<p>Shares <b>rose</b> 5% after the report.</p>', 'Other', 'X')).toBe(
      'Shares rose 5% after the report.',
    );
  });

  test('a month of feeds: weekly topic windows, per-ticker searches and outlet feeds', () => {
    expect(weeklyWindows('2026-11-15', 2)).toEqual([
      { after: '2026-11-02', before: '2026-11-09' },
      { after: '2026-11-09', before: '2026-11-16' },
    ]);
    expect(googleNews('stock market', { after: '2026-11-02', before: '2026-11-09' }).url).toBe(
      'https://news.google.com/rss/search?q=stock+market+after%3A2026-11-02+before%3A2026-11-09&hl=en-US&gl=US&ceid=US:en',
    );
    const feeds = defaultFeeds({ end: '2026-11-15', weeks: 2, tickers: 1, topics: 1 });
    expect(feeds.map(({ id }) => id).slice(0, 4)).toEqual([
      'google:stock market@2026-11-02',
      'google:stock market@2026-11-09',
      'google:AAPL Apple stock',
      'yahoo:AAPL',
    ]);
  });
});

describe('ItemStore', () => {
  test('dedupes by id and by story, and resumes from its file', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'finance-items-')), 'items.jsonl');
    const [google] = items('google:AAPL', GOOGLE_NEWS);
    const store = new ItemStore(path);
    expect(store.add([google, google])).toHaveLength(1);
    // The same story from the outlet's own feed: another id, same outlet and headline.
    const copy = {
      ...google,
      id: 'other',
      link: 'https://reuters.com/x',
      title: 'Apple Beats Q4 Estimates, as iPhone sales jump',
    };
    expect(storyKey(copy)).toBe(storyKey(google));
    expect(store.add([copy])).toHaveLength(0);

    const reopened = new ItemStore(path);
    expect(reopened.items).toEqual([google]);
    expect(reopened.add(items('yahoo:AAPL', YAHOO))).toHaveLength(1);
    expect(new ItemStore(path).size).toBe(2);
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
