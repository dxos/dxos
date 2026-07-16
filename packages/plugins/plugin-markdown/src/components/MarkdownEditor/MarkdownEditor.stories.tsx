//
// Copyright 2023 DXOS.org
//

import { type Decorator, type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { Filter, Obj } from '@dxos/echo';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { Sketch } from '@dxos/plugin-sketch';
import { SketchPlugin } from '@dxos/plugin-sketch/plugin';
import { SketchBuilder } from '@dxos/plugin-sketch/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { type Client } from '@dxos/react-client';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';
import { AttendableContainer } from '@dxos/react-ui-attention';
import { Editor } from '@dxos/react-ui-editor';
import { translations as editorTranslations } from '@dxos/react-ui-editor/translations';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';

import { useLinkQuery } from '#hooks';
import { translations } from '#translations';
import { Markdown } from '#types';

import { MarkdownEditor, MarkdownEditorProvider, type MarkdownEditorProviderProps } from './MarkdownEditor';

type StoryArgs = Omit<MarkdownEditorProviderProps, 'id' | 'extensions' | 'children'>;

const DefaultStory = (props: StoryArgs) => {
  const [space] = useSpaces();
  const [doc] = useQuery(space?.db, Filter.type(Markdown.Document));
  const handleLinkQuery = useLinkQuery(space?.db, doc);
  const id = doc && Obj.getURI(doc);
  if (!id) {
    return <Loading data={{ id }} />;
  }

  return (
    <AttendableContainer id={id} tabIndex={0} classNames='dx-container'>
      <MarkdownEditorProvider id={id} attendableId={id} object={doc} onLinkQuery={handleLinkQuery} {...props}>
        {(editorRootProps) => (
          <Editor.Root {...editorRootProps}>
            {/* Mirror MarkdownArticle: Panel.Toolbar/Content are NOT `asChild` (MarkdownEditor.Toolbar is not
                composable, so asChild wraps it in a dx-slot-warning div that breaks the grid-area layout). */}
            <Panel.Root role='article'>
              <Panel.Toolbar>
                <MarkdownEditor.Toolbar classNames='dx-document' />
              </Panel.Toolbar>
              <Panel.Content>
                <MarkdownEditor.Content />
                {/* Embedded objects (transclusions) portal into block-container elements created by the editor. */}
                <MarkdownEditor.Blocks />
              </Panel.Content>
            </Panel.Root>
          </Editor.Root>
        )}
      </MarkdownEditorProvider>
    </AttendableContainer>
  );
};

const seedPlainDocument = (client: Client) =>
  Effect.gen(function* () {
    const { personalSpace } = yield* initializeIdentity(client);
    personalSpace.db.add(Markdown.make({ content: Array.from({ length: 100 }, (_, i) => `Line ${i + 1}`).join('\n') }));
  });

const seedEmbeddedSketch = (client: Client) =>
  Effect.gen(function* () {
    const { personalSpace } = yield* initializeIdentity(client);
    const sketch = personalSpace.db.add(
      Sketch.make({
        name: 'Test Sketch',
        canvas: {
          content: new SketchBuilder()
            .rectangle({
              id: 'rect',
              x: 0,
              y: 0,
              text: 'DXOS',
              color: 'blue',
              fill: 'solid',
              size: 'l',
            })
            .build(),
        },
      }),
    );

    personalSpace.db.add(
      Markdown.make({
        content: [
          '# Test Document',
          '',
          'The sketch below renders inline as a block surface:',
          '',
          `![${sketch.name}](${Obj.getURI(sketch)})`,
          '',
        ].join('\n'),
      }),
    );
  });

const withClient = (seed: (client: Client) => Effect.Effect<void>): Decorator =>
  withPluginManager({
    // SketchPlugin's section surface reads its Settings atom, contributed on SetupSettings.
    setupEvents: [AppActivationEvents.SetupSettings],
    plugins: [
      ...corePlugins(),
      SketchPlugin(),
      ClientPlugin({
        types: [Markdown.Document, Text.Text, Sketch.Sketch, Sketch.Canvas],
        onClientInitialized: ({ client }) => seed(client),
      }),
    ],
  });

const meta: Meta<typeof DefaultStory> = {
  title: 'plugins/plugin-markdown/components/MarkdownEditor',
  render: DefaultStory,
  decorators: [withLayout({ layout: 'column' })],
  parameters: {
    translations: [...translations, ...editorTranslations],
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [withClient(seedPlainDocument)],
};

export const WithEmbeddedSketch: Story = {
  decorators: [withClient(seedEmbeddedSketch)],
};
