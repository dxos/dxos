//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database } from '@dxos/echo';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import * as MarkdownPlugin from '@dxos/plugin-markdown/MarkdownPlugin';
import { Text } from '@dxos/schema';

import * as Demo from '../Demo.ts';

const content = `# Launch checklist

Both peers edit this document. Type on one side and watch the other.

- [x] Draft the announcement
- [ ] Record the demo video
- [ ] Update the docs

Switch a peer offline, keep typing on both sides, then switch it back on: the edits merge.
`;

const partial = SampleSpace.partial('echo-demo-editor', {
  schemas: [Markdown.Document, Text.Text],
  run: () =>
    Effect.gen(function* () {
      const document = yield* Database.add(Markdown.make({ name: 'Launch checklist', content }));
      return { document };
    }),
});

export const EditorDemo = Demo.make({
  id: 'editor',
  title: 'Collaborative editor',
  partial,
  plugins: () => [MarkdownPlugin.make()],
  views: { document: 'Document' },
  layout: ['document', 'document'],
});
