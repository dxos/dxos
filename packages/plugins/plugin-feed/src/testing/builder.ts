//
// Copyright 2025 DXOS.org
//

import { subDays } from 'date-fns';

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

  /** Builds the result: a feed and sorted posts. */
  build(): BuildResult {
    const feed = Subscription.makeFeed({
      name: this._feedName,
      url: this._feedUrl,
      description: faker.lorem.sentence(),
    });

    const sortedPosts = [...this._posts].sort((postA, postB) =>
      (postB.published ?? '').localeCompare(postA.published ?? ''),
    );

    return { feed, posts: sortedPosts };
  }
}
