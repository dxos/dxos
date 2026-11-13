//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database } from '@dxos/echo';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import * as MarkdownPlugin from '@dxos/plugin-markdown/MarkdownPlugin';
import * as MermaidPlugin from '@dxos/plugin-mermaid/MermaidPlugin';
import { Text } from '@dxos/schema';
import * as Cell from '@dxos/storybook-testing/Cell';
import * as ModuleContainer from '@dxos/storybook-testing/ModuleContainer';

import { decorators } from '../testing.ts';

const content = `# Launch checklist

Both peers edit this document. Type on one side and watch the other.

- [x] Draft the announcement
- [ ] Record the demo video
- [ ] Update the docs

\`\`\`mermaid
flowchart LR
  Draft --> Record --> Docs --> Launch
\`\`\`

Switch a peer offline, keep typing on both sides, then switch it back on: the edits merge.
`;

const editor = SampleSpace.partial('echo-demo-editor', {
  schemas: [Markdown.Document, Text.Text],
  run: () =>
    Effect.gen(function* () {
      const document = yield* Database.add(Markdown.make({ name: 'Launch checklist', content }));
      return { document };
    }),
});

const meta: Meta<typeof ModuleContainer.Root> = {
  title: 'stories/stories-echo/Editor',
  render: ModuleContainer.Root,
  args: { compact: true },
  parameters: { layout: 'fullscreen' },
  tags: ['docs-embed'],
};

export default meta;

/** One markdown document that both peers edit. */
export const Editor: StoryObj = {
  decorators: decorators({
    title: 'Collaborative editor',
    plugins: [MarkdownPlugin.make(), MermaidPlugin.make()],
    onInit: async ({ run }) => {
      const { document } = await run(editor);
      return [[Cell.article(document)]];
    },
  }),
};
