//
// Copyright 2026 DXOS.org
//

import { type CollectionEntry, getCollection } from 'astro:content';

import { type AgentSection, isAgentPage, parsePages, readSpec } from './spec.ts';

/** The written pages of a section's site map, in spec order; the section's other docs are not exported to agents. */
export const sectionEntries = async (section: AgentSection): Promise<CollectionEntry<'docs'>[]> => {
  const entries = await getCollection('docs');
  return parsePages(readSpec())
    .filter(isAgentPage(section))
    .map((page) => {
      const id = page.route.replace(/^\/|\/$/g, '');
      const entry = entries.find((entry) => entry.id === id);
      if (!entry) {
        throw new Error(`Spec page has no content entry: ${id}`);
      }
      return entry;
    });
};
