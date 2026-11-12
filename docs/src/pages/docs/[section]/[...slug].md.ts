//
// Copyright 2026 DXOS.org
//

import { type CollectionEntry } from 'astro:content';

import { sectionEntries } from '../../../echo/entries.ts';
import { toMarkdown } from '../../../echo/markdown.ts';
import { AGENT_SECTION_IDS } from '../../../echo/spec.ts';

export const getStaticPaths = async () =>
  (
    await Promise.all(
      AGENT_SECTION_IDS.map(async (section) =>
        (await sectionEntries(section)).map((entry) => ({
          params: { section, slug: entry.id.replace(`docs/${section}/`, '') },
          props: { entry },
        })),
      ),
    )
  ).flat();

export const GET = ({ props }: { props: { entry: CollectionEntry<'docs'> } }) => {
  const { data, body } = props.entry;
  return new Response(toMarkdown(data.title, data.description, body ?? ''), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};
