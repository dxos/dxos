//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useMemo } from 'react';

import { Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import { AppActivationEvents, LayoutOperation } from '@dxos/app-toolkit';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Query } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { Sketch } from '@dxos/plugin-sketch';
import { SketchPlugin } from '@dxos/plugin-sketch/plugin';
import { SketchBuilder } from '@dxos/plugin-sketch/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { random } from '@dxos/random';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { useAsyncEffect } from '@dxos/react-ui';
import { useAttentionAttributes } from '@dxos/react-ui-attention';
import { withLayout } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import { type ValueGenerator, createObjectFactory } from '@dxos/schema/testing';
import { Organization, Person } from '@dxos/types';

import { translations } from '#translations';
import { Markdown, MarkdownCapabilities, MarkdownEvents } from '#types';

import { MarkdownPlugin } from '../../MarkdownPlugin';

random.seed(1);

const generator: ValueGenerator = random as any;

// A minimal sketch (tldraw `tldraw.com/2`) snapshot, used as a test sketch.
const SKETCH_CONTENT = new SketchBuilder()
  .rectangle({ id: 'rect', x: 0, y: 0, text: 'DXOS', color: 'blue', fill: 'solid', size: 'l' })
  .build();

/** Minimal plugin that contributes an empty Extensions capability for stories. */
const MarkdownExtensionsPlugin = Plugin.define(
  Plugin.makeMeta({
    key: DXN.make('org.dxos.plugin.markdown.story.markdownExtensions'),
    name: 'Story Extensions',
  }),
).pipe(
  Plugin.addModule({
    id: 'extensions',
    activatesOn: MarkdownEvents.SetupExtensions,
    activate: () => Effect.succeed(Capability.contributes(MarkdownCapabilities.ExtensionProvider, [])),
  }),
  Plugin.make,
);

type StoryArgs = {
  title: string;
  content: string;
  objects?: boolean;
};

const DefaultStory = () => {
  const { invokePromise } = useOperationInvoker();
  const [space] = useSpaces();
  const [doc] = useQuery(space?.db, Query.type(Markdown.Document));
  const id = doc && Obj.getURI(doc);
  const data = useMemo(() => ({ subject: doc, attendableId: id ?? 'story' }), [doc, id]);
  const attentionAttrs = useAttentionAttributes(id);

  useAsyncEffect(async () => {
    if (space) {
      await invokePromise(LayoutOperation.SwitchWorkspace, { subject: space.id });
    }
  }, [space, invokePromise]);

  return (
    <div className='contents' {...attentionAttrs}>
      <Surface.Surface type={AppSurface.Article} data={data} limit={1} />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-markdown/containers/MarkdownArticle',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'column' }),
    withPluginManager<StoryArgs>(({ args: { title = 'Testing', content = '', objects: showObjects = false } }) => ({
      // SketchPlugin's section surface reads its Settings atom, contributed on SetupSettings.
      setupEvents: [AppActivationEvents.SetupSettings, MarkdownEvents.SetupExtensions],
      plugins: [
        ...corePlugins(),
        StorybookPlugin({}),
        MarkdownExtensionsPlugin(),
        SketchPlugin(),
        ClientPlugin({
          types: [Markdown.Document, Text.Text, Person.Person, Organization.Organization, Sketch.Sketch, Sketch.Canvas],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);

              let objects: Obj.Any[] = [];
              if (showObjects) {
                const createObjects = createObjectFactory(personalSpace.db, generator);
                objects = yield* Effect.promise(() =>
                  createObjects([
                    {
                      type: Organization.Organization,
                      count: 1,
                    },
                    {
                      type: Person.Person,
                      count: 1,
                    },
                  ]),
                );

                objects.push(
                  Sketch.make({
                    name: 'Test Sketch',
                    canvas: {
                      content: SKETCH_CONTENT,
                    },
                  }),
                );

                objects.forEach((object) => personalSpace.db.add(object));
                yield* Effect.promise(() => personalSpace.db.flush());
              }

              personalSpace.db.add(
                Markdown.make({
                  name: title,
                  content: [
                    `# ${title}`,
                    content,
                    objects
                      .map((object, i) => [
                        'This is object #' + (i + 1),
                        `![${Obj.getLabel(object)}|300](${Obj.getURI(object)})`,
                      ])
                      .flat()
                      .join('\n\n'),
                    'This is the end of the document.',
                  ].join('\n\n'),
                }),
              );

              yield* Effect.promise(() => personalSpace.db.flush({ indexes: true }));
            }),
        }),

        MarkdownPlugin(),
        PreviewPlugin(),
      ],
    })),
  ],
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<StoryArgs>;

export const Default: Story = {
  args: {
    title: 'Testing',
    content: 'Hello, world!',
  },
};

export const WithObjects: Story = {
  args: {
    title: 'Testing with objects',
    content: 'Here are some inline objects:',
    objects: true,
  },
};
