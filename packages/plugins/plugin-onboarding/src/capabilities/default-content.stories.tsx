//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Query } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { DXN } from '@dxos/keys';
import { promptRunExtension } from '@dxos/plugin-assistant/extensions';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { MarkdownPlugin } from '@dxos/plugin-markdown/plugin';
import { translations as markdownTranslations } from '@dxos/plugin-markdown/translations';
import { Markdown, MarkdownCapabilities } from '@dxos/plugin-markdown/types';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { useSpaces } from '@dxos/react-client/echo';
import { useAsyncEffect } from '@dxos/react-ui';
import { withLayout } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';

import README_CONTENT from '../content/readme.md?raw';
import { README_DOCUMENT_NAME } from './default-content';

/**
 * Contributes the assistant's prompt-run extension so the ```prompt blocks in the README (e.g. the
 * "Create a project…" prompt) render their run button. Clicking it surfaces the prompt text — the
 * story stub logs it rather than spawning a chat, so the interaction is testable without an LLM.
 */
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
  const [doc] = useQuery(space?.db, Query.type(Markdown.Document));
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
        StorybookPlugin({}),
        PromptExtensionPlugin(),
        ClientPlugin({
          types: [Markdown.Document, Text.Text],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);
              personalSpace.db.add(Markdown.make({ name: README_DOCUMENT_NAME, content: README_CONTENT }));
              yield* Effect.promise(() => personalSpace.db.flush({ indexes: true }));
            }),
        }),
        MarkdownPlugin(),
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
