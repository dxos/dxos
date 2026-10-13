//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, waitFor, within } from 'storybook/test';

import { Filter, Obj } from '@dxos/echo';
import * as IllustratorPlugin from '@dxos/plugin-illustrator/IllustratorPlugin';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import * as MarkdownPlugin from '@dxos/plugin-markdown/MarkdownPlugin';
import * as MermaidPlugin from '@dxos/plugin-mermaid/MermaidPlugin';
import { Cell, ModuleContainer, createStoryDecorators } from '@dxos/storybook-testing';

import { CanvasPlugin } from '#plugin';
import { translations } from '#translations';

import * as ArchitectureSpace from './ArchitectureSpace.ts';

type StoryArgs = {
  /** The template document opened as the article. */
  document: 'Composer' | 'DXOS' | 'EDGE';
};

const template = ArchitectureSpace.makeTemplate();

// The space is seeded by the template's own `apply`, exactly as Composer applies it when a space is created from it.
const withTemplate = createStoryDecorators<StoryArgs>(({ args }) => ({
  types: [...ArchitectureSpace.make().schemas],
  plugins: [IllustratorPlugin.make(), CanvasPlugin(), MarkdownPlugin.make(), MermaidPlugin.make()],
  onInit: async ({ client, space }) => {
    await template.apply({ client, space });
    await space.db.flush();
    const documents = await space.db.query(Filter.type(Markdown.Document)).run();
    const document = documents.find((document) => Obj.getLabel(document) === args.document);
    if (!document) {
      throw new Error(`The template seeded no ${args.document} document.`);
    }
    return [[Cell.article(document)]];
  },
}));

const meta: Meta<StoryArgs> = {
  title: 'plugins/plugin-canvas/samples/ArchitectureSpace',
  render: () => <ModuleContainer />,
  decorators: withTemplate,
  args: { document: 'Composer' },
  argTypes: { document: { control: 'inline-radio', options: ['Composer', 'DXOS', 'EDGE'] } },
  parameters: { layout: 'fullscreen', translations },
};

export default meta;

type Story = StoryObj<typeof meta>;

/** The Composer document, which links DXOS and EDGE and embeds the Composer architecture. */
export const Default: Story = {
  // The editor draws headings as lines rather than heading elements, so the document is recognised by its text.
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByTestId('scene-view', undefined, { timeout: 60_000 })).toBeVisible();
    await waitFor(() => expect(canvasElement.textContent).toContain('A local-first workspace of plugins'), {
      timeout: 10_000,
    });
  },
};

/** The DXOS document, embedding the data stack. */
export const Dxos: Story = { args: { document: 'DXOS' } };

/** The EDGE document, embedding the EDGE architecture. */
export const Edge: Story = { args: { document: 'EDGE' } };
