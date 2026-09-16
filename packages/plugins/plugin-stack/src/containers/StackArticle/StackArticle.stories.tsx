//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import * as Capability from '@dxos/app-framework/Capability';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Collection, Filter, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as IllustratorPlugin from '@dxos/plugin-illustrator/IllustratorPlugin';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { MarkdownPlugin } from '@dxos/plugin-markdown/testing';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import * as Tldraw from '@dxos/plugin-tldraw/Tldraw';
import * as TldrawModel from '@dxos/plugin-tldraw/TldrawModel';
import * as TldrawPlugin from '@dxos/plugin-tldraw/TldrawPlugin';
import { random } from '@dxos/random';
import { useClient } from '@dxos/react-client';
import { withMosaic } from '@dxos/react-ui-mosaic/testing';
import { Loading, withLayout } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { StackArticle, type StackArticleProps } from './StackArticle.tsx';

// A minimal sketch (tldraw `tldraw.com/2`) snapshot, used as a test image.
const SKETCH_CONTENT = new TldrawModel.RecordBuilder()
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
      capabilities: [Capability.contribute(AppCapabilities.Translations, translations)],
      plugins: [
        ...corePlugins(),
        ClientPlugin.make({
          types: [Collection.Collection, Markdown.Document, Drawing.Drawing, Drawing.Canvas],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { defaultSpace: space } = yield* initializeIdentity(client);

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
                    Drawing.make({
                      name: random.lorem.sentence(2),
                      canvas: Drawing.makeCanvas({ schema: Tldraw.TLDRAW_SCHEMA, content: SKETCH_CONTENT }),
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
        MarkdownPlugin.make(),
        IllustratorPlugin.make(),
        TldrawPlugin.make(),
        SpacePlugin({}),
        StorybookPlugin.make({}),
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
