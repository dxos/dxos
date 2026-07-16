//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { Obj, Query } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { withLayout } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import { Branch, Version } from '@dxos/versioning';

import { translations } from '#translations';
import { Markdown, MarkdownCapabilities, MarkdownEvents } from '#types';

import { MarkdownPlugin } from '../../MarkdownPlugin';
import { DocumentHistory } from './DocumentHistory';

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

const DefaultStory = () => {
  const [space] = useSpaces();
  const [doc] = useQuery(space?.db, Query.type(Markdown.Document));
  if (!doc) {
    return <></>;
  }

  return <DocumentHistory role='article' subject={doc} attendableId={Obj.getURI(doc)} />;
};

const meta = {
  title: 'plugins/plugin-markdown/containers/DocumentHistory',
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

              const doc = personalSpace.db.add(
                Markdown.make({ name: 'Project Plan', content: 'alpha\nbravo\ncharlie\n' }),
              );
              yield* Effect.promise(() => personalSpace.db.flush());

              const root = doc.content.target;
              if (root) {
                Version.create(doc, { name: 'first draft', target: root });
                Obj.update(root, (root) => {
                  root.content = 'alpha\nbravo\ncharlie\ndelta\n';
                });
                Version.create(doc, { name: 'v2 outline', target: root });

                const branch = Branch.create(doc, { name: 'agent-draft', parent: root });
                const branchText = branch.content.target;
                if (branchText) {
                  Obj.update(branchText, (branchText) => {
                    branchText.content = 'alpha edited\nbravo\ncharlie\ndelta\nepsilon\n';
                  });
                }
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
