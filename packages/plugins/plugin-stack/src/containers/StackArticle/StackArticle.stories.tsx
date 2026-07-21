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
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { Markdown, MarkdownEvents } from '@dxos/plugin-markdown';
import { MarkdownPlugin } from '@dxos/plugin-markdown/testing';
import { Sketch } from '@dxos/plugin-sketch';
import { SketchPlugin } from '@dxos/plugin-sketch/plugin';
import { SketchBuilder } from '@dxos/plugin-sketch/testing';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { random } from '@dxos/random';
import { useClient } from '@dxos/react-client';
import { withMosaic } from '@dxos/react-ui-mosaic/testing';
import { Loading, withLayout } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { StackArticle, type StackArticleProps } from './StackArticle';

// A minimal sketch (tldraw `tldraw.com/2`) snapshot, used as a test image.
const SKETCH_CONTENT = new SketchBuilder()
  .rectangle({ id: 'rect', x: 0, y: 0, text: 'DXOS', color: 'blue', fill: 'solid', size: 'l' })
  .ellipse({ id: 'echo', x: 320, y: 0, text: 'ECHO', color: 'green' })
  .arrow({ from: 'rect', to: 'echo' })
  .build();

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
    withMosaic(),
    withLayout({ layout: 'fullscreen' }),
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

              const insertAt = 1;
              space.db.add(
                Collection.make({
                  name: random.lorem.sentence(5),
                  objects: [...documents.slice(0, insertAt), ...sketches, ...documents.slice(insertAt + 1)],
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
