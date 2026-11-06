//
// Copyright 2026 DXOS.org
//

import { type CollectionEntry } from 'astro:content';

import { echoEntries } from '../../../echo/entries.ts';
import { toMarkdown } from '../../../echo/markdown.ts';

export const getStaticPaths = async () => {
  const entries = await echoEntries();
  return entries.map((entry) => ({ params: { slug: entry.id.replace(/^docs\/echo\//, '') }, props: { entry } }));
};

export const GET = ({ props }: { props: { entry: CollectionEntry<'docs'> } }) => {
  const { data, body } = props.entry;
  return new Response(toMarkdown(data.title, data.description, body ?? ''), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};
