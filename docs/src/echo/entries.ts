//
// Copyright 2026 DXOS.org
//

import { type CollectionEntry, getCollection } from 'astro:content';

import { ECHO_DOCS, parsePages, readSpec } from './spec.ts';

/** The written pages of the ECHO spec's site map, in spec order; the other ECHO docs are not exported to agents. */
export const echoEntries = async (): Promise<CollectionEntry<'docs'>[]> => {
  const entries = await getCollection('docs');
  return parsePages(readSpec())
    .filter((page) => page.status !== 'planned')
    .map((page) => {
      const id = `${ECHO_DOCS}${page.route}`.replace(/^\/|\/$/g, '');
      const entry = entries.find((entry) => entry.id === id);
      if (!entry) {
        throw new Error(`Spec page has no content entry: ${id}`);
      }
      return entry;
    });
};
