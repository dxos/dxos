//
// Copyright 2025 DXOS.org
//

import { subDays } from 'date-fns';

import { Ref } from '@dxos/echo';
import { random } from '@dxos/random';

import { Magazine, Subscription } from '#types';

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
): Subscription.Subscription =>
  Subscription.makeSubscription({
    name: props.name ?? random.company.name() + ' Blog',
    url: props.url ?? random.internet.url(),
    description: props.description ?? random.lorem.sentence(),
  });

/**
 * Generates a Post. Note: per-Post state (snippet, imageUrl, readAt) is no
 * longer on the Post itself — it lives on the source Subscription's or
 * Magazine's `postState` map. The caller is responsible for seeding those if
 * the story / test needs them. The `read` / `imageUrl` params are kept on
 * the signature for back-compat call sites; they are currently no-ops and
 * will be wired through state-seeding helpers in a follow-up.
 */
export const generateCuratedPost = (_props: { imageUrl?: string; read?: boolean } = {}): Subscription.Post => {
  const description = random.lorem.paragraph(random.number.int({ min: 2, max: 4 }));
  // TODO: seed Magazine.postState / Subscription.postState here once the
  // builder has access to them; for now Posts are bare feed entries and
  // tile snippets are recomputed on render from `description`.
  return Subscription.makePost({
    title: random.lorem.sentence(random.number.int({ min: 4, max: 10 })),
    link: random.internet.url(),
    description,
    author: random.person.fullName(),
    published: new Date(Date.now() - Math.random() * 7 * 24 * 3600 * 1000).toISOString(),
    guid: random.string.uuid(),
  });
};

/** Generates a Magazine with the given curated posts. Feeds default to empty. */
export const generateMagazine = (
  props: Partial<{
    name: string;
    feeds: Subscription.Subscription[];
    posts: Subscription.Post[];
  }> = {},
): Magazine.Magazine => {
  return Magazine.make({
    name: props.name ?? random.company.name() + ' Reading List',
    feeds: (props.feeds ?? []).map((feed) => Ref.make(feed)),
    posts: (props.posts ?? []).map((post) => Ref.make(post)),
  }).magazine;
};
