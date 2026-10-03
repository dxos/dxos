//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Query, Type } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { DXN } from '@dxos/keys';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import * as MarkdownCapabilities from '@dxos/plugin-markdown/MarkdownCapabilities';
import * as MarkdownPlugin from '@dxos/plugin-markdown/MarkdownPlugin';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { translations as spaceTranslations } from '@dxos/plugin-space/translations';
import { corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { useSpaces } from '@dxos/react-client/echo';
import { Form } from '@dxos/react-ui-form';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import { Branch, Version } from '@dxos/versioning';

import { translations } from '#translations';

import { MarkdownProperties } from './MarkdownProperties.tsx';

const MarkdownExtensionsPlugin = Plugin.define(
  Plugin.makeMeta({
    key: DXN.make('org.dxos.plugin.markdown.story.propertiesExtensions'),
    name: 'Story Extensions',
  }),
).pipe(
  Plugin.addModule({
    id: 'extensions',
    provides: [MarkdownCapabilities.ExtensionProvider],
    activate: () => Effect.succeed([Capability.contribute(MarkdownCapabilities.ExtensionProvider, [])]),
  }),
  Plugin.make,
);

const DefaultStory = () => {
  const [space] = useSpaces();
  const [doc] = useQuery(space?.db, Query.type(Markdown.Document));
  if (!doc) {
    return <Loading />;
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
  title: 'plugins/plugin-review/components/MarkdownProperties',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'column' }),
    withPluginManager(() => ({
      plugins: [
        ...corePlugins(),
        StorybookPlugin.make({}),
        MarkdownExtensionsPlugin(),
        ClientPlugin.make({
          types: [Markdown.Document, Text.Text],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { defaultSpace } = yield* initializeIdentity(client);
              const doc = defaultSpace.db.add(Markdown.make({ name: 'Project Plan', content: 'alpha\nbravo\n' }));
              yield* Effect.promise(() => defaultSpace.db.flush());
              const root = doc.content.target;
              if (root) {
                Version.create(doc, { name: 'first draft', target: root });
                yield* Effect.promise(() => Branch.create(doc, { name: 'agent-draft', parent: root }));
              }
              yield* Effect.promise(() => defaultSpace.db.flush({ indexes: true }));
            }),
        }),
        // Contributes the versioning-state atom consumed by useVersioning.
        SpacePlugin({}),
        MarkdownPlugin.make(),
      ],
    })),
  ],
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    translations: [...translations, ...spaceTranslations],
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
