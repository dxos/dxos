//
// Copyright 2026 DXOS.org
//

import { getCollection } from 'astro:content';

import { toMarkdown } from '../util/markdown.ts';

export const GET = async () => {
  const entries = await getCollection('docs');
  const body = entries
    .filter((entry) => entry.id !== 'index' && entry.id !== '404')
    .map((entry) => toMarkdown(entry.data.title, entry.data.description, entry.body ?? ''))
    .join('\n---\n\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
