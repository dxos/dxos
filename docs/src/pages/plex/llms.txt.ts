//
// Copyright 2026 DXOS.org
//

export const GET = ({ site }: { site?: URL }) => {
  const body = [
    '# PLEX',
    '',
    '> An agentic framework for building apps out of plugins.',
    '',
    'This file is a placeholder; it does not list the PLEX pages yet.',
    '',
    '## See also',
    '',
    `- [ECHO llms.txt](${new URL('/echo/llms.txt', site)}): the ECHO site map, in the same format.`,
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
