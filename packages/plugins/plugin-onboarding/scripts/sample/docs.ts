//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database } from '@dxos/echo';
import * as Markdown from '@dxos/plugin-markdown/Markdown';

//
// Welcome documents
//

export type DocsContent = {
  /** `sample/README.md` — the space tour the user lands on. */
  readonly tourMd: string;
  /** `sample/ABOUT.md` — the canonical reference for every Bramble world-fact. */
  readonly aboutMd: string;
};

/** The two documents that explain the space to whoever just had it imported for them. */
export type DocsResult = { tour: Markdown.Document; about: Markdown.Document };

export const Docs: SampleSpace.Phase<DocsResult, DocsContent> = SampleSpace.phase('docs', {
  schemas: [Markdown.Document],
  run: ({ tourMd, aboutMd }: DocsContent) =>
    Effect.gen(function* () {
      const tour = yield* Database.add(Markdown.make({ name: 'Space Tour', content: tourMd }));
      const about = yield* Database.add(Markdown.make({ name: 'About Bramble Coffee Roasters', content: aboutMd }));
      return { tour, about };
    }),
});
