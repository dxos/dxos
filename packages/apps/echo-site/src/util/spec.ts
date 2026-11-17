//
// Copyright 2026 DXOS.org
//

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const STATUSES = ['planned', 'spike', 'done'] as const;

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
  route: string;
  group: string;
  template: string;
  status: Status;
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

/** Reads the `page` blocks of a spec, in document order. */
export const parsePages = (source: string): SpecPage[] =>
  blocksOf(source, 'page').map((body) => {
    const [header, summary] = body.split('\n');
    const [, id, label] = header.match(/^page ([\w-]+): (.*)$/) ?? [];
    return {
      id,
      label,
      summary: summary.trim(),
      route: field(body, 'route'),
      group: field(body, 'group'),
      template: field(body, 'template'),
      status: parseStatus(field(body, 'status')),
    };
  });

/** Reads the `template` blocks of a spec. */
export const parseTemplates = (source: string): SpecTemplate[] =>
  blocksOf(source, 'template').map((body) => ({
    id: body.split('\n')[0].match(/^template ([\w-]+)/)?.[1] ?? '',
    purpose: field(body, 'purpose'),
    parts: [...body.matchAll(/^    - (.*)$/gm)].map((match) => match[1]),
  }));

// Resolved from the package root since this module also runs from Astro's build output, where a relative URL would miss.
export const readSpec = (): string => readFileSync(join(process.cwd(), 'SPEC.mdl'), 'utf8');

/** Throws unless every written page in the spec has a content file at its route. */
export const assertContentExists = (pages: SpecPage[]): void => {
  const missing = pages
    .filter((page) => page.status !== 'planned')
    .filter((page) => {
      const base = join(process.cwd(), 'src/content/docs', page.route.replace(/\/$/, ''));
      return !existsSync(`${base}.mdx`) && !existsSync(join(base, 'index.mdx'));
    });
  if (missing.length > 0) {
    throw new Error(`Spec pages with no content file: ${missing.map((page) => page.route).join(', ')}`);
  }
};

/** The Starlight sidebar for the spec's site map; group order is first appearance. */
export const sidebarFromSpec = (pages: SpecPage[]) => {
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
