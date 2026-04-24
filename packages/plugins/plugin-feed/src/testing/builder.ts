//
// Copyright 2025 DXOS.org
//

import { subDays } from 'date-fns';

import { Ref } from '@dxos/echo';
import { random } from '@dxos/random';

import { Magazine, Subscription } from '#types';

import { makeSnippet, stripHtml } from '../util/extract';

/** Generates an array of random posts. */
export const generatePosts = (count: number): Subscription.Post[] => {
  const now = new Date();
  const start = subDays(now, 30);
  const rangeMs = now.getTime() - start.getTime();

  return Array.from({ length: count }, () => {
    const published = new Date(start.getTime() + Math.random() * rangeMs);
    return Subscription.makePost({
      title: random.lorem.sentence(random.number.int({ min: 4, max: 10 })),
      link: random.internet.url(),
      description: random.lorem.paragraph(random.number.int({ min: 1, max: 3 })),
      author: random.person.fullName(),
      published: published.toISOString(),
      guid: random.string.uuid(),
    });
  }).sort((postA, postB) => (postB.published ?? '').localeCompare(postA.published ?? ''));
};

/** Generates a random subscription feed. */
export const generateFeed = (
  props: Partial<{ name: string; url: string; description: string }> = {},
): Subscription.Feed =>
  Subscription.makeFeed({
    name: props.name ?? random.company.name() + ' Blog',
    url: props.url ?? random.internet.url(),
    description: props.description ?? random.lorem.sentence(),
  });

/** Generates a curated Post with snippet and (optionally) imageUrl populated, as CurateMagazine would. */
export const generateCuratedPost = (props: { imageUrl?: string; read?: boolean } = {}): Subscription.Post => {
  const description = random.lorem.paragraph(random.number.int({ min: 2, max: 4 }));
  const imageUrl =
    props.imageUrl ?? (Math.random() < 0.6 ? `https://picsum.photos/seed/${random.string.uuid()}/480/320` : undefined);
  return Subscription.makePost({
    title: random.lorem.sentence(random.number.int({ min: 4, max: 10 })),
    link: random.internet.url(),
    description,
    author: random.person.fullName(),
    published: new Date(Date.now() - Math.random() * 7 * 24 * 3600 * 1000).toISOString(),
    guid: random.string.uuid(),
    snippet: makeSnippet(stripHtml(description)),
    imageUrl,
    readAt: props.read ? new Date().toISOString() : undefined,
  });
};

/** Generates a Magazine with the given curated posts. Feeds default to empty. */
export const generateMagazine = (
  props: Partial<{
    name: string;
    instructions: string;
    feeds: Subscription.Feed[];
    posts: Subscription.Post[];
  }> = {},
): Magazine.Magazine =>
  Magazine.make({
    name: props.name ?? random.company.name() + ' Reading List',
    instructions: props.instructions ?? 'Surface articles about distributed systems and local-first software.',
    feeds: (props.feeds ?? []).map((feed) => Ref.make(feed)),
    posts: (props.posts ?? []).map((post) => Ref.make(post)),
  });
