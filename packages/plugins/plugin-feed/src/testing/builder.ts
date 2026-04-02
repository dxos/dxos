//
// Copyright 2025 DXOS.org
//

import { subDays } from 'date-fns';
import { XMLParser } from 'fast-xml-parser';

import { faker } from '@dxos/random';

import { Subscription } from '../types';

export type DateRange = {
  start?: Date;
  end?: Date;
};

export type BuilderOptions = {
  posts?: DateRange;
};

export type BuildResult = {
  feed: Subscription.Feed;
  posts: Subscription.Post[];
};

/**
 * Chainable builder for creating test feed data.
 *
 * @example
 * ```ts
 * const { feed, posts } = new Builder()
 *   .createPosts(50)
 *   .build();
 * ```
 */
export class Builder {
  private readonly _posts: Subscription.Post[] = [];
  private readonly _postRange: Required<DateRange>;
  private _feedName: string;
  private _feedUrl: string;
  private _feedDescription: string = '';

  constructor({ posts }: BuilderOptions = {}) {
    const now = new Date();
    this._postRange = {
      start: posts?.start ?? subDays(now, 30),
      end: posts?.end ?? now,
    };
    this._feedName = faker.company.name() + ' Blog';
    this._feedUrl = faker.internet.url();
  }

  private _randomTimeInRange(range: Required<DateRange>): Date {
    const rangeMs = range.end.getTime() - range.start.getTime();
    return new Date(range.start.getTime() + Math.random() * rangeMs);
  }

  /** Creates a single post with random data. */
  createPost(): this {
    const published = this._randomTimeInRange(this._postRange);
    this._posts.push(
      Subscription.makePost({
        title: faker.lorem.sentence(faker.number.int({ min: 4, max: 10 })),
        link: faker.internet.url(),
        description: faker.lorem.paragraph(faker.number.int({ min: 1, max: 3 })),
        author: faker.person.fullName(),
        published: published.toISOString(),
        guid: faker.string.uuid(),
      }),
    );
    return this;
  }

  /** Creates multiple posts with random data. */
  createPosts(count: number): this {
    for (let index = 0; index < count; index++) {
      this.createPost();
    }
    return this;
  }

  /**
   * Fetches and parses an RSS/Atom feed URL, populating the builder with real posts.
   * Sets the feed name, URL, and description from the channel metadata.
   */
  async fromRss(url: string, { corsProxy }: { corsProxy?: string } = {}): Promise<this> {
    const fetchUrl = corsProxy ? `${corsProxy}${encodeURIComponent(url)}` : url;
    const response = await fetch(fetchUrl);
    const xml = await response.text();
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
    const parsed = parser.parse(xml);

    // Support RSS 2.0 and Atom.
    const channel = parsed.rss?.channel ?? parsed.feed;
    if (!channel) {
      throw new Error('Unrecognized feed format');
    }

    const isAtom = !parsed.rss;
    this._feedUrl = url;
    this._feedName = (isAtom ? (channel.title?.['#text'] ?? channel.title) : channel.title) ?? this._feedName;
    this._feedDescription = (isAtom ? channel.subtitle : channel.description) ?? '';

    const items: any[] = (isAtom ? channel.entry : channel.item) ?? [];
    const itemList = Array.isArray(items) ? items : [items];

    for (const item of itemList) {
      const link = isAtom
        ? ((Array.isArray(item.link)
            ? item.link.find((link: any) => link['@_rel'] === 'alternate')?.['@_href']
            : item.link?.['@_href']) ?? '')
        : (item.link ?? '');

      this._posts.push(
        Subscription.makePost({
          title: isAtom ? (item.title?.['#text'] ?? item.title) : item.title,
          link,
          description: isAtom ? (item.summary ?? item.content?.['#text'] ?? item.content) : (item.description ?? ''),
          author: isAtom ? (item.author?.name ?? item.author) : (item['dc:creator'] ?? item.author),
          published: item.pubDate ?? item.published ?? item.updated,
          guid: isAtom ? item.id : (item.guid?.['#text'] ?? item.guid ?? link),
        }),
      );
    }

    return this;
  }

  /** Builds the result: a feed and sorted posts. */
  build(): BuildResult {
    const feed = Subscription.makeFeed({
      name: this._feedName,
      url: this._feedUrl,
      description: this._feedDescription || faker.lorem.sentence(),
    });

    const sortedPosts = [...this._posts].sort((postA, postB) =>
      (postB.published ?? '').localeCompare(postA.published ?? ''),
    );

    return { feed, posts: sortedPosts };
  }
}
