//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Filter, Obj } from '@dxos/echo';
import { ClientPlugin } from '@dxos/plugin-client';
import { corePlugins } from '@dxos/plugin-testing';
import { useQuery, useSpace } from '@dxos/react-client/echo';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { useAttentionAttributes } from '@dxos/react-ui-attention';
import { translations as editorTranslations } from '@dxos/react-ui-editor';
import { StackItem } from '@dxos/react-ui-stack';

import { translations } from '../../translations';
import { Markdown } from '../../types';

import { MarkdownEditor, type MarkdownEditorRootProps } from './MarkdownEditor';

const content = Array.from({ length: 100 }, (_, i) => `Line ${i + 1}`).join('\n');

type StoryProps = Omit<MarkdownEditorRootProps, 'id' | 'extensions'>;

const DefaultStory = (props: StoryProps) => {
  const space = useSpace();
  const [doc] = useQuery(space?.db, Filter.type(Markdown.Document));
  const id = doc && Obj.getDXN(doc).toString();
  const attentionAttrs = useAttentionAttributes(id);

  if (!id) {
    return null;
  }

  return (
    <div className='contents' {...attentionAttrs}>
      <StackItem.Content toolbar>
        <MarkdownEditor.Root id={id} object={doc} {...props}>
          <MarkdownEditor.Toolbar id={id} />
          <MarkdownEditor.Content />
        </MarkdownEditor.Root>
      </StackItem.Content>
    </div>
  );
};

const meta: Meta<typeof DefaultStory> = {
  title: 'plugins/plugin-markdown/MarkdownEditor',
  component: DefaultStory,
  render: DefaultStory as any,
  decorators: [
    withTheme,
    withLayout({ layout: 'column' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Markdown.Document],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* Effect.promise(() => client.halo.createIdentity());
              yield* Effect.promise(() => client.spaces.waitUntilReady());
              const space = client.spaces.default;
              yield* Effect.promise(() => space.waitUntilReady());

              space.db.add(Markdown.make({ content }));
            }),
        }),
        ...corePlugins(),
      ],
    }),
  ],
  parameters: {
    translations: [...translations, ...editorTranslations],
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
