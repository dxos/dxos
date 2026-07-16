//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { Query, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { Form } from '@dxos/react-ui-form';
import { withLayout } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import { createBranch, createCheckpoint } from '@dxos/versioning';

import { translations } from '#translations';
import { Markdown, MarkdownCapabilities, MarkdownEvents } from '#types';

import { MarkdownPlugin } from '../../MarkdownPlugin';
import { MarkdownProperties } from './MarkdownProperties';

const MarkdownExtensionsPlugin = Plugin.define(
  Plugin.makeMeta({
    key: DXN.make('org.dxos.plugin.markdown.story.propertiesExtensions'),
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

const DefaultStory = () => {
  const [space] = useSpaces();
  const [doc] = useQuery(space?.db, Query.type(Markdown.Document));
  if (!doc) {
    return <></>;
  }

  return (
    <Form.Root schema={Type.getSchema(Markdown.Document)} values={doc}>
      <Form.Viewport>
        <Form.Content>
          <MarkdownProperties role='object-properties' subject={doc} />
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

const meta = {
  title: 'plugins/plugin-markdown/containers/MarkdownProperties',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'column' }),
    withPluginManager(() => ({
      setupEvents: [AppActivationEvents.SetupSettings, MarkdownEvents.SetupExtensions],
      plugins: [
        ...corePlugins(),
        StorybookPlugin({}),
        MarkdownExtensionsPlugin(),
        ClientPlugin({
          types: [Markdown.Document, Text.Text],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);
              const doc = personalSpace.db.add(Markdown.make({ name: 'Project Plan', content: 'alpha\nbravo\n' }));
              yield* Effect.promise(() => personalSpace.db.flush());
              const root = doc.content.target;
              if (root) {
                createCheckpoint(doc, { name: 'first draft', target: root });
                createBranch(doc, { name: 'agent-draft', parent: root });
              }
              yield* Effect.promise(() => personalSpace.db.flush({ indexes: true }));
            }),
        }),
        MarkdownPlugin(),
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

export const Default: Story = {};
