//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { Capability } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AppActivationEvents, AppCapabilities } from '@dxos/app-toolkit';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Collection, Filter, Ref } from '@dxos/echo';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { Markdown, MarkdownEvents } from '@dxos/plugin-markdown';
import { MarkdownPlugin } from '@dxos/plugin-markdown/testing';
import { Sketch } from '@dxos/plugin-sketch';
import { SketchPlugin } from '@dxos/plugin-sketch/plugin';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { random } from '@dxos/random';
import { useClient } from '@dxos/react-client';
import { useQuery } from '@dxos/react-client/echo';
import { Loading, withLayout } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { StackArticle, type StackArticleProps } from './StackArticle';

// A minimal tldraw (schema `tldraw.com/2`) snapshot: a single labelled rectangle, used as a test image.
const SKETCH_CONTENT = {
  'document:document': { gridSize: 10, name: 'Test', meta: {}, id: 'document:document', typeName: 'document' },
  'page:page': { meta: {}, id: 'page:page', name: 'Page 1', index: 'a1', typeName: 'page' },
  'shape:rect': {
    x: 0,
    y: 0,
    rotation: 0,
    isLocked: false,
    opacity: 1,
    meta: {},
    id: 'shape:rect',
    type: 'geo',
    props: {
      w: 160,
      h: 120,
      geo: 'rectangle',
      color: 'blue',
      labelColor: 'black',
      fill: 'solid',
      dash: 'draw',
      size: 'l',
      font: 'draw',
      text: 'DXOS',
      align: 'middle',
      verticalAlign: 'middle',
      growY: 0,
      url: '',
      scale: 1,
    },
    parentId: 'page:page',
    index: 'a1',
    typeName: 'shape',
  },
};

const DefaultStory = (args: StackArticleProps) => {
  const client = useClient();
  const [space] = client.spaces.get();
  const [collection] = useQuery(space?.db, Filter.type(Collection.Collection));
  if (!collection) {
    return <Loading />;
  }

  return <StackArticle {...args} subject={collection} attendableId='test' />;
};

const meta: Meta<typeof StackArticle> = {
  title: 'plugins/plugin-stack/containers/StackArticle',
  component: StackArticle,
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'column', classNames: 'dx-document' }),
    withPluginManager({
      setupEvents: [AppActivationEvents.SetupSettings, MarkdownEvents.SetupExtensions],
      capabilities: [Capability.contributes(AppCapabilities.Translations, translations)],
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Collection.Collection, Markdown.Document, Sketch.Sketch, Sketch.Canvas],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace: space } = yield* initializeIdentity(client);

              const documents = Array.from({ length: 5 }).map(() =>
                Ref.make(
                  space.db.add(
                    Markdown.make({
                      name: random.lorem.sentence(5),
                      content:
                        [
                          `# ${random.lorem.sentence(5)}`,
                          random.lorem.paragraph(),
                          random.lorem.paragraph(),
                          random.lorem.paragraph(),
                        ].join('\n\n') + '\n',
                    }),
                  ),
                ),
              );

              const sketches = [
                Ref.make(
                  space.db.add(
                    Sketch.make({
                      name: random.lorem.sentence(2),
                      canvas: {
                        content: SKETCH_CONTENT,
                      },
                    }),
                  ),
                ),
              ];

              space.db.add(
                Collection.make({
                  name: random.lorem.sentence(5),
                  objects: [...documents.slice(0, 2), ...sketches, ...documents.slice(3)],
                }),
              );
            }),
        }),
        MarkdownPlugin(),
        SketchPlugin(),
        SpacePlugin({}),
        StorybookPlugin({}),
      ],
    }),
  ],
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    role: AppSurface.Article.role,
  },
};
