//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Filter, Obj } from '@dxos/echo';
import { ClientPlugin } from '@dxos/plugin-client';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { useQuery, useSpace } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { AttendableContainer } from '@dxos/react-ui-attention';
import { translations as editorTranslations } from '@dxos/react-ui-editor';
import { Text } from '@dxos/schema';

import { translations } from '../../translations';
import { Markdown } from '../../types';

import { MarkdownEditor, type MarkdownEditorRootProps } from './MarkdownEditor';

type DefaultStoryProps = Omit<MarkdownEditorRootProps, 'id' | 'extensions'>;

const DefaultStory = (props: DefaultStoryProps) => {
  const space = useSpace();
  const [doc] = useQuery(space?.db, Filter.type(Markdown.Document));
  const id = doc && Obj.getDXN(doc).toString();
  if (!id) {
    return <Loading data={{ id }} />;
  }

  return (
    <AttendableContainer id={id} tabIndex={0} classNames='dx-container'>
      <MarkdownEditor.Root id={id} object={doc} {...props}>
        <Panel.Root>
          <Panel.Toolbar asChild>
            <MarkdownEditor.Toolbar />
          </Panel.Toolbar>
          <Panel.Content asChild>
            <MarkdownEditor.Content />
          </Panel.Content>
        </Panel.Root>
      </MarkdownEditor.Root>
    </AttendableContainer>
  );
};

const meta: Meta<typeof DefaultStory> = {
  title: 'plugins/plugin-markdown/components/MarkdownEditor',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'column' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        // TODO(burdon): Try to write story without ClientPlugin.
        ClientPlugin({
          types: [Markdown.Document, Text.Text],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);
              personalSpace.db.add(
                Markdown.make({ content: Array.from({ length: 100 }, (_, i) => `Line ${i + 1}`).join('\n') }),
              );
            }),
        }),
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
