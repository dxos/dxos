//
// Copyright 2026 DXOS.org
//

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** The sections whose pages are exported to agents, by the path segment their routes and llms.txt files use. */
export const AGENT_SECTION_IDS = ['echo', 'halo', 'mesh', 'edge', 'sage', 'plex', 'tile'] as const;

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
  mesh: {
    label: 'MESH',
    summary:
      'Peer networking for ECHO and HALO: swarms, signaling and the transports that carry replication, presence and invitations.',
  },
  edge: {
    label: 'EDGE',
    summary:
      "DXOS's services on Cloudflare Workers: an always-online peer for every space and identity, with replication, indexing, identity services and compute.",
  },
  sage: {
    label: 'SAGE',
    summary:
      'Durable AI agents with their own identity: typed operations as tools, skills loaded per task, and any model, local or hosted.',
  },
  plex: {
    label: 'PLEX',
    summary: 'An agentic framework for building apps out of plugins.',
  },
  tile: {
    label: 'TILE',
    summary: 'The DXOS design system: themed UI components and the tokens behind them, usable in any React app.',
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
  /** The component package a page documents; it nests the page in a group of its own inside `group`. */
  package?: string;
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

const optionalField = (body: string, key: string): string | undefined =>
  body.match(new RegExp(`^  ${key}: (.*)$`, 'm'))?.[1];

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
      package: optionalField(body, 'package'),
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

const sidebarLink = (page: SpecPage) => ({
  label: page.label,
  link: page.route,
  ...(page.status === 'planned' ? { badge: { text: 'planned', variant: 'default' as const } } : {}),
});

const byLabel = (a: SpecPage, b: SpecPage) => a.label.localeCompare(b.label);

/**
 * The Starlight sidebar for one section of the spec's site map; group order is first appearance. A top-level group
 * starts expanded; pages with a `package` follow the group's own pages in a nested group per package, alphabetically,
 * which starts collapsed and opens when the current page is in it [D-286].
 */
export const sidebarFromSpec = (allPages: SpecPage[], section: string) => {
  const pages = allPages.filter((page) => page.section === section && page.status !== 'later');
  const groups = [...new Set(pages.map((page) => page.group))];
  return groups.map((label) => {
    const inGroup = pages.filter((page) => page.group === label);
    const packages = [...new Set(inGroup.flatMap((page) => (page.package ? [page.package] : [])))].sort();
    return {
      label,
      items: [
        ...inGroup.filter((page) => !page.package).map(sidebarLink),
        ...packages.map((pkg) => ({
          // Every package in a group shares the `react-ui-` prefix, so the label drops it.
          label: pkg.replace(/^react-ui-/, ''),
          collapsed: true,
          items: inGroup
            .filter((page) => page.package === pkg)
            .sort(byLabel)
            .map(sidebarLink),
        })),
      ],
    };
  });
};
