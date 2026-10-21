//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, waitFor } from 'storybook/test';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as Surface from '@dxos/app-framework/Surface';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Filter } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { useQuery } from '@dxos/react-client/echo';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';

import { translations } from '#translations';
import { Markdown } from '#types';

import { PreviewComponent } from './PreviewComponent.tsx';

/** A fixed-height cell with template whitespace around its content block, as a lit-rendered grid cell has. */
const Cell = () => (
  <div
    data-testid='cell'
    className='h-8 overflow-hidden'
    dangerouslySetInnerHTML={{ __html: '\n      <div data-testid="cell-text">A</div>\n    ' }}
  />
);

const SectionPlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.test.previewSection'), name: 'PreviewSectionStory' }),
).pipe(
  Plugin.addModule({
    id: 'surfaces',
    provides: [Capabilities.ReactSurface],
    activate: () =>
      Effect.succeed([
        Capability.contribute(Capabilities.ReactSurface, [
          Surface.create({
            id: 'section',
            filter: AppSurface.object(AppSurface.Section, Markdown.Document),
            component: Cell,
          }),
        ]),
      ]),
  }),
  Plugin.make,
);

const DefaultStory = () => {
  const { space } = useClientStory();
  const [doc] = useQuery(space?.db, Filter.type(Markdown.Document));
  if (!space || !doc) {
    return null;
  }

  // `break-spaces` is what CodeMirror's `.cm-content` sets on everything an embed renders inside.
  return (
    <div className='whitespace-break-spaces w-96'>
      <PreviewComponent
        _tag='image'
        range={{ from: 0, to: 0 }}
        id='embed'
        db={space.db}
        eid={`echo:/${doc.id}`}
        label='embedded'
      />
    </div>
  );
};

const meta: Meta<typeof DefaultStory> = {
  title: 'plugins/plugin-markdown/components/PreviewComponent',
  component: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'column' }),
    withClientProvider({
      types: [Markdown.Document, Text.Text],
      createIdentity: true,
      createSpace: true,
      onCreateSpace: ({ space }) => {
        space.db.add(Markdown.make({ name: 'embedded', content: 'hello' }));
      },
    }),
    withPluginManager({ plugins: [SectionPlugin()] }),
    // Outermost, so the plugin manager's atom registry is not replaced by the decorator's own.
    withAttention(),
  ],
  parameters: {
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

/** The editor's whitespace stops at the embed: the cell's text stays inside its cell. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    await waitFor(
      async () => {
        const cell = canvasElement.querySelector<HTMLElement>('[data-testid="cell"]');
        const text = canvasElement.querySelector<HTMLElement>('[data-testid="cell-text"]');
        if (!cell || !text) {
          throw new Error('Section surface not rendered.');
        }
        const offset = text.getBoundingClientRect().top - cell.getBoundingClientRect().top;
        await expect(offset).toBe(0);
      },
      { timeout: 10_000 },
    );
  },
};
