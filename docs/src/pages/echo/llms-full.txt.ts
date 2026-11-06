//
// Copyright 2026 DXOS.org
//

import { echoEntries } from '../../echo/entries.ts';
import { toMarkdown } from '../../echo/markdown.ts';

export const GET = async () => {
  const body = (await echoEntries())
    .map((entry) => toMarkdown(entry.data.title, entry.data.description, entry.body ?? ''))
    .join('\n---\n\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
