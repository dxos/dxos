//
// Copyright 2026 DXOS.org
//

import { getCollection } from 'astro:content';

import { toMarkdown } from '../lib/markdown.ts';

export const GET = async () => {
  const entries = await getCollection('docs');
  const body = entries
    .filter((entry) => entry.id.startsWith('docs/'))
    .map((entry) => toMarkdown(entry.data.title, entry.data.description, entry.body ?? ''))
    .join('\n---\n\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
