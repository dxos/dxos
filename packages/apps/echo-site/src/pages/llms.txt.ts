//
// Copyright 2026 DXOS.org
//

import { parsePages, readSpec } from '../util/spec.ts';

export const GET = ({ site }: { site?: URL }) => {
  const pages = parsePages(readSpec()).filter((page) => page.status !== 'planned');
  const groups = [...new Set(pages.map((page) => page.group))];
  const body = [
    '# ECHO',
    '',
    '> The typed, local-first object graph. Objects are stored on the device as CRDT documents and merged between peers.',
    '',
    ...groups.flatMap((group) => [
      `## ${group}`,
      '',
      ...pages
        .filter((page) => page.group === group)
        .map(
          (page) =>
            `- [${page.label}](${new URL(`${import.meta.env.BASE_URL}${page.route.replace(/\/$/, '')}.md`, site)}): ${page.summary}`,
        ),
      '',
    ]),
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
