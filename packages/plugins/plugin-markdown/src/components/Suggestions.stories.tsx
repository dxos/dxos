//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React, { type FC, useMemo, useState } from 'react';

import {
  CollaborationActions,
  createIntent,
  IntentPlugin,
  SettingsPlugin,
  useIntentDispatcher,
} from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Message } from '@dxos/artifact';
import { create, ObjectId } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { DXN, QueueSubspaceTags, SpaceId } from '@dxos/keys';
import { ClientPlugin } from '@dxos/plugin-client';
import { SpacePlugin } from '@dxos/plugin-space';
import { createDocAccessor, createObject, useQueue } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { IconButton, Toolbar } from '@dxos/react-ui';
import {
  automerge,
  command,
  createRenderer,
  translations as editorTranslations,
  preview,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { StackItem } from '@dxos/react-ui-stack';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { MarkdownEditor } from './MarkdownEditor';
import translations from '../translations';

const PreviewBlock = () => {
  return <div>PreviewBlock</div>;
};

const PreviewCard = () => {
  return <div>PreviewCard</div>;
};

// TODO(burdon): Factor out (reconcile with ThreadContainer.stories.tsx)
const randomQueueDxn = () =>
  new DXN(DXN.kind.QUEUE, [QueueSubspaceTags.DATA, SpaceId.random(), ObjectId.random()]).toString();

const TestChat: FC<{ content: string }> = ({ content }) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const { parentRef } = useTextEditor({ initialValue: content });
  const [queueDxn] = useState<string>(() => randomQueueDxn());
  const queue = useQueue<Message>(DXN.tryParse(queueDxn));

  const handleInsert = () => {
    invariant(queue);
    queue.append([create(Message, { role: 'assistant', content: [{ type: 'text', text: 'Hello' }] })]);
    const message = queue.items[queue.items.length - 1];

    void dispatch(
      createIntent(CollaborationActions.InsertContent, {
        label: 'Proposal',
        queueId: queue.dxn.toString(),
        messageId: message.id,
        // TODO(burdon): Why artifact?
        associatedArtifact: {} as any,
      }),
    );
  };

  return (
    <StackItem.Content toolbar classNames='w-full'>
      <Toolbar.Root>
        <IconButton icon='ph--plus--regular' disabled={!queue} label='Insert' onClick={handleInsert} />
      </Toolbar.Root>
      <div ref={parentRef} className='grow p-4' />
    </StackItem.Content>
  );
};

const TestDocument: FC<{ content: string }> = ({ content }) => {
  const doc = useMemo(() => createObject({ content }), []);
  const extensions = useMemo(
    () => [
      automerge(createDocAccessor(doc, ['content'])),
      command(),
      preview({
        renderBlock: createRenderer(PreviewBlock),
        renderPopover: createRenderer(PreviewCard),
        onLookup: async () => undefined,
      }),
    ],
    [doc],
  );

  return <MarkdownEditor id='document' initialValue={doc.content} extensions={extensions} toolbar />;
};

const DefaultStory = ({ document, chat }: { document: string; chat: string }) => {
  return (
    <div className='grow grid grid-cols-2 overflow-hidden divide-x divide-divider'>
      <TestDocument content={document} />
      <TestChat content={chat} />
    </div>
  );
};

const meta: Meta<typeof DefaultStory> = {
  title: 'plugins/plugin-markdown/Suggestions',
  render: DefaultStory,
  decorators: [
    withClientProvider({
      createIdentity: true,
      createSpace: true,
    }),
    withPluginManager({
      plugins: [
        ClientPlugin({
          onClientInitialized: async (_, client) => {
            await client.halo.createIdentity();
          },
        }),
        SpacePlugin(),
        SettingsPlugin(),
        IntentPlugin(),
      ],
    }),
    withTheme,
    withLayout({ tooltips: true, fullscreen: true }),
  ],
  parameters: {
    translations: [...translations, ...editorTranslations],
  },
};

export default meta;

type Story = Meta<typeof DefaultStory>;

export const Default: Story = {
  args: {
    document: '# Test\n\n',
    chat: 'Hello\n',
  },
};
