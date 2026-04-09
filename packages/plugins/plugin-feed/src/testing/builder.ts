//
// Copyright 2025 DXOS.org
//

import { subDays } from 'date-fns';

import { random } from '@dxos/random';

import { Subscription } from '#types';

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
