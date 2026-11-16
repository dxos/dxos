//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { createHash } from 'node:crypto';

import { type Subscription } from '#types';

/** One news item a finance feed carried: the headline and summary only, never the article page. */
export const NewsItem = Schema.Struct({
  /** Stable id: a hash of the item's guid (else its link). */
  id: Schema.String,
  title: Schema.String,
  /** The feed's description, when it says more than the title. */
  summary: Schema.optional(Schema.String),
  link: Schema.String,
  /** The outlet that published it (Google News names it after the title; otherwise the link's host). */
  publisher: Schema.String,
  /** ISO time. */
  published: Schema.optional(Schema.String),
  /** Id of the feed spec it came from. */
  feed: Schema.String,
  /** ISO time it was fetched. */
  fetchedAt: Schema.String,
});
export interface NewsItem extends Schema.Schema.Type<typeof NewsItem> {}

/** A 64-bit hash of a guid or link: the item ids of a month of feeds would collide at 32 bits. */
export const itemId = (key: string): string => createHash('sha256').update(key).digest('hex').slice(0, 16);

/** Google News titles end in ` - Publisher`; the publisher is split off so the headline reads on its own. */
export const splitPublisher = (title: string): { headline: string; publisher?: string } => {
  const match = /^(.*\S)\s+-\s+([^-]{2,60})$/.exec(title.trim());
  return match ? { headline: match[1], publisher: match[2].trim() } : { headline: title.trim() };
};

const words = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/**
 * The description as plain text: markdown links keep their text, images and markup go, and a description that only
 * repeats the headline (Google News wraps the title in a link plus the outlet's name) is dropped.
 */
export const cleanSummary = (
  description: string | undefined,
  headline: string,
  publisher?: string,
): string | undefined => {
  if (!description) {
    return undefined;
  }
  const text = description
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[*_`#>]+/g, ' ')
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const rest = words(text)
    .replace(words(headline), '')
    .replace(words(publisher ?? ''), '')
    .trim();
  return rest.length < 12 ? undefined : text;
};

const hostOf = (link: string): string | undefined => {
  try {
    return new URL(link).hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
};

/** Parses an RSS date (RFC 822) or ISO date to ISO; undefined when it is not a date. */
export const toIsoDate = (value: string | undefined): string | undefined => {
  if (!value) {
    return undefined;
  }
  const time = Date.parse(value);
  return Number.isNaN(time) ? undefined : new Date(time).toISOString();
};

/** A feed post as a {@link NewsItem}; undefined for a post without a title or link. */
export const fromPost = (post: Subscription.Post, feed: string, fetchedAt: string): NewsItem | undefined => {
  if (!post.title || !post.link) {
    return undefined;
  }
  const { headline, publisher } = feed.startsWith('google:')
    ? splitPublisher(post.title)
    : { headline: post.title.trim(), publisher: undefined };
  const outlet = publisher ?? hostOf(post.link) ?? 'unknown';
  const summary = cleanSummary(post.description, headline, outlet);
  const published = toIsoDate(post.published);
  return {
    id: itemId(post.guid ?? post.link),
    title: headline,
    ...(summary ? { summary } : {}),
    link: post.link,
    publisher: outlet,
    ...(published ? { published } : {}),
    feed,
    fetchedAt,
  };
};

/**
 * The key two copies of one story share across feeds: the outlet and its normalized headline, since the same article
 * reaches Google News and the outlet's own feed under different links and guids.
 */
export const storyKey = (item: Pick<NewsItem, 'title' | 'publisher'>): string =>
  `${words(item.publisher)}|${words(item.title)}`;

/** The item's text as extraction reads it: the headline, then the summary when there is one. */
export const itemText = (item: NewsItem): string => (item.summary ? `${item.title}\n${item.summary}` : item.title);

/** The source DXN facts from this item carry. */
export const itemSource = (item: Pick<NewsItem, 'id'>): string => `news:${item.id}`;
