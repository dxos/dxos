//
// Copyright 2026 DXOS.org
//

import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';

export const GET = async (context: APIContext) => {
  const posts = (await getCollection('blog')).sort(
    (a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime(),
  );

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
