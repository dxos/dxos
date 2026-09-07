//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Query, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { DXN } from '@dxos/keys';
import { promptRunExtension } from '@dxos/plugin-assistant/extensions';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import * as MarkdownCapabilities from '@dxos/plugin-markdown/MarkdownCapabilities';
import * as MarkdownPlugin from '@dxos/plugin-markdown/MarkdownPlugin';
import { translations as markdownTranslations } from '@dxos/plugin-markdown/translations';
import { corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { useSpaces } from '@dxos/react-client/echo';
import { useAsyncEffect } from '@dxos/react-ui';
import { withLayout } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';

import DXOS_CONTENT from '../content/DXOS.md?raw';
import README_CONTENT from '../content/README.md?raw';
import { DXOS_DOCUMENT_NAME, DXOS_URI_PLACEHOLDER, README_DOCUMENT_NAME } from './default-content';

/** Contributes the prompt-run extension so the README's ```prompt block renders its run button, logging instead of calling an LLM. */
const PromptExtensionPlugin = Plugin.define(
  Plugin.makeMeta({
    key: DXN.make('org.dxos.plugin.onboarding.story.promptExtension'),
    name: 'Story Prompt Extension',
  }),
).pipe(
  Plugin.addModule({
    id: 'extensions',
    provides: [MarkdownCapabilities.ExtensionProvider],
    activate: () =>
      Effect.succeed([
        Capability.contribute(MarkdownCapabilities.ExtensionProvider, [
          () => promptRunExtension({ onRun: (promptText) => console.log('[run prompt]', promptText) }),
        ]),
      ]),
  }),
  Plugin.make,
);

const DefaultStory = () => {
  const { invokePromise } = useOperationInvoker();
  const [space] = useSpaces();
  const docs = useQuery(space?.db, Query.type(Markdown.Document));
  const doc = docs.find((markdownDoc) => markdownDoc.name === README_DOCUMENT_NAME);
  const id = doc && Obj.getURI(doc);

  useAsyncEffect(async () => {
    if (space) {
      await invokePromise(LayoutOperation.SwitchWorkspace, { subject: space.id });
    }
  }, [space, invokePromise]);

  return (
    <div className='contents'>
      <Surface.Surface type={AppSurface.Article} data={{ subject: doc, attendableId: id ?? 'story' }} limit={1} />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-onboarding/default-content',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'column' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        StorybookPlugin.make({}),
        PromptExtensionPlugin(),
        ClientPlugin.make({
          types: [Markdown.Document, Text.Text],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { defaultSpace } = yield* initializeIdentity(client);
              // Mirror the production seeder: create the vision doc first so its URI can be
              // substituted into the README's placeholder link.
              const visionDoc = Markdown.make({ name: DXOS_DOCUMENT_NAME, content: DXOS_CONTENT });
              defaultSpace.db.add(visionDoc);
              defaultSpace.db.add(
                Markdown.make({
                  name: README_DOCUMENT_NAME,
                  content: README_CONTENT.replace(DXOS_URI_PLACEHOLDER, Ref.make(visionDoc).uri),
                }),
              );
              yield* Effect.promise(() => defaultSpace.db.flush({ indexes: true }));
            }),
        }),
        MarkdownPlugin.make(),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    translations: markdownTranslations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
