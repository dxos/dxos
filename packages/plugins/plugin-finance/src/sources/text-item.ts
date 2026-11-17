//
// Copyright 2026 DXOS.org
//

import { Obj } from '@dxos/echo';
import type * as Subscription from '@dxos/plugin-magazine/Subscription';

/** The origin of a feed item: `Obj.Meta.keys[0]`, e.g. `{ source: 'news.google.com', id: <guid> }`. */
export type ForeignKey = { readonly source: string; readonly id: string };

/**
 * A text item as extraction reads it: a feed post (headline and summary, never a scraped article page) with its
 * foreign key, which is the provenance every fact from it carries.
 */
export type TextItem = {
  readonly key: ForeignKey;
  readonly title: string;
  /** The feed's description, when it says more than the title. */
  readonly summary?: string;
  readonly link: string;
  /** The outlet, wire, bank or subreddit that published it. */
  readonly publisher: string;
  /** ISO time it was published (the fetch time when the feed gave none). */
  readonly published: string;
};

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
  maxLength = 1_200,
): string | undefined => {
  if (!description) {
    return undefined;
  }
  const text = description
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[*_`#>|]+/g, ' ')
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const rest = words(text)
    .replace(words(headline), '')
    .replace(words(publisher ?? ''), '')
    .trim();
  if (rest.length < 12) {
    return undefined;
  }
  return text.length > maxLength ? `${text.slice(0, maxLength).replace(/\s+\S*$/, '')}…` : text;
};

/** Parses an RSS date (RFC 822) or ISO date to ISO; undefined when it is not a date. */
export const toIsoDate = (value: string | undefined): string | undefined => {
  if (!value) {
    return undefined;
  }
  const time = Date.parse(value);
  return Number.isNaN(time) ? undefined : new Date(time).toISOString();
};

/** The host of a URL without `www.`, or undefined for a malformed one. */
export const hostOf = (link: string): string | undefined => {
  try {
    return new URL(link).hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
};

/**
 * The key two copies of one story share across feeds: the outlet and its normalized headline, since the same article
 * reaches Google News and the outlet's own feed under different links and guids.
 */
export const storyKey = (item: Pick<TextItem, 'title' | 'publisher'>): string =>
  `${words(item.publisher)}|${words(item.title)}`;

/** The item's text as extraction reads it: the headline, then the summary when there is one. */
export const itemText = (item: Pick<TextItem, 'title' | 'summary'>): string =>
  item.summary ? `${item.title}\n${item.summary}` : item.title;

/** The provenance facts from this item carry: its foreign key as one string. */
export const itemSource = (item: Pick<TextItem, 'key'>): string => `${item.key.source}:${item.key.id}`;

/** A stored feed post as a {@link TextItem}; undefined for one without a key, title or link. */
export const fromPost = (post: Subscription.Post): TextItem | undefined => {
  const [key] = Obj.getMeta(post).keys;
  if (!key || !post.title || !post.link || !post.published) {
    return undefined;
  }
  return {
    key: { source: key.source, id: key.id },
    title: post.title,
    ...(post.description ? { summary: post.description } : {}),
    link: post.link,
    publisher: post.author ?? key.source,
    published: post.published,
  };
};
