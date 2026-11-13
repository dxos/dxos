//
// Copyright 2026 DXOS.org
//

import {
  AGENT_SECTION_IDS,
  AGENT_SECTIONS,
  type AgentSection,
  isAgentPage,
  parsePages,
  readSpec,
} from '../../echo/spec.ts';

export const getStaticPaths = () => AGENT_SECTION_IDS.map((section) => ({ params: { section } }));

export const GET = ({ params, site }: { params: { section: AgentSection }; site?: URL }) => {
  const { label, summary } = AGENT_SECTIONS[params.section];
  const pages = parsePages(readSpec()).filter(isAgentPage(params.section));
  const groups = [...new Set(pages.map((page) => page.group))];
  const body = [
    `# ${label}`,
    '',
    `> ${summary}`,
    '',
    ...groups.flatMap((group) => [
      `## ${group}`,
      '',
      ...pages
        .filter((page) => page.group === group)
        .map((page) => `- [${page.label}](${new URL(`${page.route.replace(/\/$/, '')}.md`, site)}): ${page.summary}`),
      '',
    ]),
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
