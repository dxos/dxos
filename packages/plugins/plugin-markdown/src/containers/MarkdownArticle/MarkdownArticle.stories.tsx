//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useMemo } from 'react';

import { Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Query } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
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
import { Markdown, MarkdownCapabilities } from '#types';

import { MarkdownPlugin } from '../../MarkdownPlugin';

random.seed(1);

const generator: ValueGenerator = random as any;

/** Minimal plugin that contributes an empty Extensions capability for stories. */
const MarkdownExtensionsPlugin = Plugin.define(
  Plugin.makeMeta({
    key: DXN.make('org.dxos.plugin.markdown.story.markdownExtensions'),
    name: 'Story Extensions',
  }),
).pipe(
  Plugin.addModule({
    id: 'extensions',
    provides: [MarkdownCapabilities.ExtensionProvider],
    activate: () => Effect.succeed([Capability.provide(MarkdownCapabilities.ExtensionProvider, [])]),
  }),
  Plugin.make,
);

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
    withPluginManager<{ title?: string; content?: string }>((context) => ({
      plugins: [
        ...corePlugins(),
        StorybookPlugin({}),
        MarkdownExtensionsPlugin(),
        ClientPlugin({
          types: [Markdown.Document, Text.Text, Person.Person, Organization.Organization],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);

              const createObjects = createObjectFactory(personalSpace.db, generator);
              yield* Effect.promise(() => createObjects([{ type: Organization.Organization, count: 10 }]));

              const kai = personalSpace.db.add(Obj.make(Person.Person, { fullName: 'Kai' }));
              const dxos = personalSpace.db.add(Obj.make(Organization.Organization, { name: 'DXOS' }));
              yield* Effect.promise(() => personalSpace.db.flush());

              personalSpace.db.add(
                Markdown.make({
                  name: context.args.title ?? 'Testing',
                  content: [
                    `# ${context.args.title ?? 'Testing'}`,
                    context.args.content ?? '',
                    // TODO(burdon): Popovers not currently working.
                    '## Here are some objects',
                    `![Alice](${Obj.getURI(kai)})`,
                    `![DXOS](${Obj.getURI(dxos)})`,
                    '',
                    'END',
                    '',
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

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Testing',
    content: ['This is a line with **some** formatting.'].join('\n\n'),
  },
};
