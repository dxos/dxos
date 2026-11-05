//
// Copyright 2026 DXOS.org
//

import { type CollectionEntry, getCollection } from 'astro:content';

import { toMarkdown } from '../lib/markdown.ts';

export const getStaticPaths = async () => {
  const entries = await getCollection('docs');
  return entries
    .filter((entry) => entry.id !== 'index' && entry.id !== '404')
    .map((entry) => ({ params: { slug: entry.id }, props: { entry } }));
};

export const GET = ({ props }: { props: { entry: CollectionEntry<'docs'> } }) => {
  const { data, body } = props.entry;
  return new Response(toMarkdown(data.title, data.description, body ?? ''), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};
