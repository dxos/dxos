//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';

import { SupportOperation } from '../types';

const handler: Operation.WithHandler<typeof SupportOperation.SearchDocs> = SupportOperation.SearchDocs.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ query, limit }) {
      const needle = query.trim().toLowerCase();
      const matches = needle
        ? DOCS_INDEX.filter(
            ({ title, excerpt }) => title.toLowerCase().includes(needle) || excerpt.toLowerCase().includes(needle),
          )
        : DOCS_INDEX;
      return { results: matches.slice(0, limit ?? 5) };
    }),
  ),
);

export default handler;

const DOCS_INDEX: ReadonlyArray<{ title: string; url: string; excerpt: string }> = [
  {
    title: 'Composer overview',
    url: 'https://docs.dxos.org/composer',
    excerpt: 'Composer is the DXOS reference application: a local-first, plugin-based workspace.',
  },
  {
    title: 'Spaces and ECHO',
    url: 'https://docs.dxos.org/guide/echo',
    excerpt: 'Spaces are replicated databases. ECHO objects live inside a space and sync across devices.',
  },
  {
    title: 'Plugins',
    url: 'https://docs.dxos.org/guide/plugins',
    excerpt: 'Plugins contribute surfaces, operations, schemas and blueprints to Composer.',
  },
];
