//
// Copyright 2026 DXOS.org
//

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** The sections whose pages are exported to agents, by the path segment their routes and llms.txt files use. */
export const AGENT_SECTION_IDS = ['echo', 'halo', 'plex'] as const;

export type AgentSection = (typeof AGENT_SECTION_IDS)[number];

export const AGENT_SECTIONS: Record<AgentSection, { label: string; summary: string }> = {
  echo: {
    label: 'ECHO',
    summary:
      'The typed, local-first object graph. Objects are stored on the device as CRDT documents and merged between peers.',
  },
  halo: {
    label: 'HALO',
    summary:
      "Identity management for local-first apps: a user's identity, the devices and credentials that act for it, and who can join a space.",
  },
  plex: {
    label: 'PLEX',
    summary: 'An agentic framework for building apps out of plugins.',
  },
};

const STATUSES = ['later', 'planned', 'spike', 'done'] as const;

type Status = (typeof STATUSES)[number];

const isStatus = (value: string): value is Status => STATUSES.some((status) => status === value);

const parseStatus = (value: string): Status => {
  if (!isStatus(value)) {
    throw new Error(`Unknown page status: ${value}`);
  }
  return value;
};

export type SpecPage = {
  id: string;
  label: string;
  summary: string;
  section: string;
  route: string;
  group: string;
  template: string;
  status: Status;
  covers: string[];
};

export type SpecTemplate = {
  id: string;
  purpose: string;
  parts: string[];
};

const blocksOf = (source: string, type: string): string[] =>
  [...source.matchAll(/^```mdl\n([\s\S]*?)^```/gm)]
    .map((match) => match[1])
    .filter((body) => body.startsWith(`${type} `));

const field = (body: string, key: string): string => {
  const match = body.match(new RegExp(`^  ${key}: (.*)$`, 'm'));
  if (!match) {
    throw new Error(`Spec block has no ${key}: ${body.split('\n')[0]}`);
  }
  return match[1];
};

/** The items of a block's list field, such as a page's `covers:`. */
const listField = (body: string, key: string): string[] => {
  const match = body.match(new RegExp(`^  ${key}:\\n((?:    - .*\\n?)*)`, 'm'));
  return match ? [...match[1].matchAll(/^    - (.*)$/gm)].map((item) => item[1]) : [];
};

/** Reads the `page` blocks of a spec, in document order. */
export const parsePages = (source: string): SpecPage[] =>
  blocksOf(source, 'page').map((body) => {
    const [header, summary] = body.split('\n');
    const [, id, label] = header.match(/^page ([\w-]+): (.*)$/) ?? [];
    return {
      id,
      label,
      summary: summary.trim(),
      section: field(body, 'section'),
      route: field(body, 'route'),
      group: field(body, 'group'),
      template: field(body, 'template'),
      status: parseStatus(field(body, 'status')),
      covers: listField(body, 'covers'),
    };
  });

/** Reads the `template` blocks of a spec. */
export const parseTemplates = (source: string): SpecTemplate[] =>
  blocksOf(source, 'template').map((body) => ({
    id: body.split('\n')[0].match(/^template ([\w-]+)/)?.[1] ?? '',
    purpose: field(body, 'purpose'),
    parts: listField(body, 'parts'),
  }));

// Resolved from the package root since this module also runs from Astro's build output, where a relative URL would miss.
export const readSpec = (): string => readFileSync(join(process.cwd(), 'SPEC.mdl'), 'utf8');

/** A page with content written for it, as opposed to a planned stub or a page left for later. */
export const isWritten = (page: SpecPage): boolean => page.status === 'spike' || page.status === 'done';

/** The written pages of a section that live under `/docs/<section>/`, the ones exported to agents. */
export const isAgentPage =
  (section: AgentSection) =>
  (page: SpecPage): boolean =>
    page.section === AGENT_SECTIONS[section].label && page.route.startsWith(`/docs/${section}/`) && isWritten(page);

/** Throws unless every written page in the spec has a content file at its route. */
export const assertContentExists = (pages: SpecPage[]): void => {
  const missing = pages.filter(isWritten).filter((page) => {
    const base = join(process.cwd(), 'src/content/docs', page.route.replace(/\/$/, ''));
    return ![`${base}.md`, `${base}.mdx`, join(base, 'index.md'), join(base, 'index.mdx')].some(existsSync);
  });
  if (missing.length > 0) {
    throw new Error(`Spec pages with no content file: ${missing.map((page) => page.route).join(', ')}`);
  }
};

/** The Starlight sidebar for one section of the spec's site map; group order is first appearance. */
export const sidebarFromSpec = (allPages: SpecPage[], section: string) => {
  const pages = allPages.filter((page) => page.section === section && page.status !== 'later');
  const groups = [...new Set(pages.map((page) => page.group))];
  return groups.map((label) => ({
    label,
    items: pages
      .filter((page) => page.group === label)
      .map((page) => ({
        label: page.label,
        link: page.route,
        ...(page.status === 'planned' ? { badge: { text: 'planned', variant: 'default' as const } } : {}),
      })),
  }));
};
