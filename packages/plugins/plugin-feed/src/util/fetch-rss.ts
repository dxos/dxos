//
// Copyright 2025 DXOS.org
//

import { XMLParser } from 'fast-xml-parser';

import { Subscription } from '#types';

import { type FeedFetcher, type FetchOptions, type FetchResult } from './feed-fetcher';

/** Fetches and parses an RSS/Atom feed URL into Subscription objects. */
export const fetchRss: FeedFetcher = async (url: string, { corsProxy }: FetchOptions = {}): Promise<FetchResult> => {
  const fetchUrl = corsProxy ? `${corsProxy}${encodeURIComponent(url)}` : url;
  const response = await fetch(fetchUrl);
  const xml = await response.text();
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const parsed = parser.parse(xml);

  const channel = parsed.rss?.channel ?? parsed.feed;
  if (!channel) {
    throw new Error('Unrecognized feed format');
  }

  const isAtom = !parsed.rss;
  const feedName = (isAtom ? (channel.title?.['#text'] ?? channel.title) : channel.title) ?? '';
  const feedDescription = (isAtom ? channel.subtitle : channel.description) ?? '';

  const items: any[] = (isAtom ? channel.entry : channel.item) ?? [];
  const itemList = Array.isArray(items) ? items : [items];

  const posts = itemList.map((item) => {
    const link = isAtom
      ? ((Array.isArray(item.link)
          ? item.link.find((l: any) => l['@_rel'] === 'alternate')?.['@_href']
          : item.link?.['@_href']) ?? '')
      : (item.link ?? '');

    return Subscription.makePost({
      title: isAtom ? (item.title?.['#text'] ?? item.title) : item.title,
      link,
      description: isAtom ? (item.summary ?? item.content?.['#text'] ?? item.content) : (item.description ?? ''),
      author: isAtom ? (item.author?.name ?? item.author) : (item['dc:creator'] ?? item.author),
      published: item.pubDate ?? item.published ?? item.updated,
      guid: isAtom ? item.id : (item.guid?.['#text'] ?? item.guid ?? link),
    });
  });

  const feed = Subscription.makeFeed({
    name: feedName,
    url,
    description: feedDescription,
  });

  return { feed, posts };
};
