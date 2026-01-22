//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useMemo } from 'react';

import { Common } from '@dxos/app-framework';
import { Surface, useOperationInvoker } from '@dxos/app-framework/react';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Obj, Query } from '@dxos/echo';
import { ClientPlugin } from '@dxos/plugin-client';
import { PreviewPlugin } from '@dxos/plugin-preview';
import { SpacePlugin } from '@dxos/plugin-space';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { faker } from '@dxos/random';
import { useQuery, useSpace } from '@dxos/react-client/echo';
import { useAsyncEffect } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { useAttentionAttributes } from '@dxos/react-ui-attention';
import { Text } from '@dxos/schema';
import { type ValueGenerator, createObjectFactory } from '@dxos/schema/testing';
import { Organization, Person } from '@dxos/types';

import { MarkdownPlugin } from '../MarkdownPlugin';
import { translations } from '../translations';
import { Markdown } from '../types';

faker.seed(1);

const generator: ValueGenerator = faker as any;

const DefaultStory = () => {
  const { invokePromise } = useOperationInvoker();
  const space = useSpace();
  const [doc] = useQuery(space?.db, Query.type(Markdown.Document));
  const data = useMemo(() => ({ subject: doc }), [doc]);
  const id = doc && Obj.getDXN(doc).toString();
  const attentionAttrs = useAttentionAttributes(id);

  useAsyncEffect(async () => {
    if (space) {
      await invokePromise(Common.LayoutOperation.SwitchWorkspace, { subject: space.id });
    }
  }, [space, invokePromise]);

  return (
    <div className='contents' {...attentionAttrs}>
      <Surface role='article' data={data} limit={1} />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-markdown/MarkdownContainer',
  render: DefaultStory,
  decorators: [
    withTheme,
    withLayout({ layout: 'column' }),
    withPluginManager<{ title?: string; content?: string }>((context) => ({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Markdown.Document, Text.Text, Person.Person, Organization.Organization],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* Effect.promise(() => client.halo.createIdentity());
              yield* Effect.promise(() => client.spaces.waitUntilReady());
              yield* Effect.promise(() => client.spaces.default.waitUntilReady());

              const space = client.spaces.default;
              const createObjects = createObjectFactory(space.db, generator);
              yield* Effect.promise(() => createObjects([{ type: Organization.Organization, count: 10 }]));

              const queue = space.queues.create();
              const kai = Obj.make(Person.Person, { fullName: 'Kai' });
              const dxos = Obj.make(Organization.Organization, { name: 'DXOS' });
              yield* Effect.promise(() => queue.append([kai, dxos]));

              space.db.add(
                Markdown.make({
                  name: context.args.title ?? 'Testing',
                  content: [
                    `# ${context.args.title ?? 'Testing'}`,
                    context.args.content ?? '',
                    // TODO(burdon): Popovers not currently working.
                    '## Here are some objects',
                    `![Alice](${Obj.getDXN(kai)})`,
                    `![DXOS](${Obj.getDXN(dxos)})`,
                    '',
                    'END',
                    '',
                  ].join('\n\n'),
                }),
              );

              yield* Effect.promise(() => space.db.flush({ indexes: true }));
            }),
        }),
        ...corePlugins(),
        SpacePlugin({}),
        StorybookPlugin({}),
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
