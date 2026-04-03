//
// Copyright 2025 DXOS.org
//

import { subDays } from 'date-fns';

import { faker } from '@dxos/random';

import { Subscription } from '../types';

/** Generates an array of random posts. */
export const generatePosts = (count: number): Subscription.Post[] => {
  const now = new Date();
  const start = subDays(now, 30);
  const rangeMs = now.getTime() - start.getTime();

  return Array.from({ length: count }, () => {
    const published = new Date(start.getTime() + Math.random() * rangeMs);
    return Subscription.makePost({
      title: faker.lorem.sentence(faker.number.int({ min: 4, max: 10 })),
      link: faker.internet.url(),
      description: faker.lorem.paragraph(faker.number.int({ min: 1, max: 3 })),
      author: faker.person.fullName(),
      published: published.toISOString(),
      guid: faker.string.uuid(),
    });
  }).sort((postA, postB) => (postB.published ?? '').localeCompare(postA.published ?? ''));
};

/** Generates a random subscription feed. */
export const generateFeed = (
  props: Partial<{ name: string; url: string; description: string }> = {},
): Subscription.Feed =>
  Subscription.makeFeed({
    name: props.name ?? faker.company.name() + ' Blog',
    url: props.url ?? faker.internet.url(),
    description: props.description ?? faker.lorem.sentence(),
  });
