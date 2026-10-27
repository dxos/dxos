//
// Copyright 2026 DXOS.org
//

import { getCollection } from 'astro:content';

/**
 * Live posts, newest first: not drafts, and dated on or before the build.
 * A future-dated post goes live with the first deploy on or after its date; dev shows it early for review.
 */
export const getPublishedPosts = async () => {
  const now = new Date();
  const posts = await getCollection('blog', ({ data }) => !data.draft && (import.meta.env.DEV || data.date <= now));
  return posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
};
