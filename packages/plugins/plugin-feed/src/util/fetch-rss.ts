//
// Copyright 2025 DXOS.org
//

import { XMLParser } from 'fast-xml-parser';

import { Subscription } from '#types';

import { type FeedFetcher, type FetchOptions, type FetchResult } from './feed-fetcher';

/**
 * Normalize a fast-xml-parser value to a plain string.
 * fast-xml-parser yields objects like `{'#text': 'foo', '@_type': 'html'}` for
 * elements with attributes, and plain strings/numbers for text-only elements.
 * Returns undefined for nullish values.
 */
const text = (value: unknown): string | undefined => {
  if (value == null) {
    return undefined;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value === 'object') {
    const t = (value as { '#text'?: unknown })['#text'];
    if (typeof t === 'string') {
      return t;
    }
    if (typeof t === 'number' || typeof t === 'boolean') {
      return String(t);
    }
  }
  return undefined;
};

/** Fetches and parses an RSS/Atom feed URL into Subscription objects. */
export const fetchRss: FeedFetcher = async (url: string, { corsProxy }: FetchOptions = {}): Promise<FetchResult> => {
  const fetchUrl = corsProxy ? `${corsProxy}${encodeURIComponent(url)}` : url;
  const response = await fetch(fetchUrl);
  const xml = await response.text();
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    // RSS/Atom feeds frequently embed HTML (sometimes un-escaped, without CDATA) in content fields,
    // which can blow past fast-xml-parser's default 100-tag nesting cap.
    maxNestedTags: 10_000,
    // Treat known HTML-bearing fields as opaque text so embedded markup isn't parsed as XML.
    stopNodes: ['*.description', '*.summary', '*.content', '*.content:encoded'],
  });
  const parsed = parser.parse(xml);

  const channel = parsed.rss?.channel ?? parsed.feed;
  if (!channel) {
    throw new Error('Unrecognized feed format');
  }

  const isAtom = !parsed.rss;
  const feedName = text(channel.title) ?? '';
  const feedDescription = text(isAtom ? channel.subtitle : channel.description) ?? '';

  const items: any[] = (isAtom ? channel.entry : channel.item) ?? [];
  const itemList = Array.isArray(items) ? items : [items];

  const posts = itemList.map((item) => {
    const link = isAtom
      ? ((Array.isArray(item.link)
          ? item.link.find((l: any) => l['@_rel'] === 'alternate')?.['@_href']
          : (item.link?.['@_href'] ?? text(item.link))) ?? '')
      : (text(item.link) ?? '');

    const author = isAtom
      ? (text(item.author?.name) ?? text(item.author))
      : (text(item['dc:creator']) ?? text(item.author));

    return Subscription.makePost({
      title: text(item.title),
      link,
      description: isAtom ? (text(item.summary) ?? text(item.content)) : (text(item.description) ?? ''),
      author,
      published: text(item.pubDate) ?? text(item.published) ?? text(item.updated),
      guid: (isAtom ? text(item.id) : text(item.guid)) ?? link,
    });
  });

  const feed = Subscription.makeFeed({
    name: feedName,
    url,
    description: feedDescription,
  });

  return { feed, posts };
};
