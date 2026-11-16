//
// Copyright 2026 DXOS.org
//

import { sectionEntries } from '../../echo/entries.ts';
import { toMarkdown } from '../../echo/markdown.ts';
import { AGENT_SECTION_IDS, type AgentSection } from '../../echo/spec.ts';

export const getStaticPaths = () => AGENT_SECTION_IDS.map((section) => ({ params: { section } }));

export const GET = async ({ params }: { params: { section: AgentSection } }) => {
  const body = (await sectionEntries(params.section))
    .map((entry) => toMarkdown(entry.data.title, entry.data.description, entry.body ?? ''))
    .join('\n---\n\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
