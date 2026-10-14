//
// Copyright 2026 DXOS.org
//

import rss from '@astrojs/rss';
import type { APIContext } from 'astro';

import { getPublishedPosts } from '../../utils/blog.ts';

export const GET = async (context: APIContext) => {
  const posts = await getPublishedPosts();

  return rss({
    title: 'DXOS Blog',
    description: 'News, engineering deep-dives, and updates from the DXOS team.',
    site: context.site ?? new URL('https://dxos.org'),
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      author: post.data.author,
      link: `/blog/${post.data.slug}`,
    })),
  });
};
