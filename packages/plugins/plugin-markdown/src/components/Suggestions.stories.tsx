//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React, { Fragment, useEffect, useMemo, useState } from 'react';

import {
  CollaborationActions,
  createIntent,
  IntentPlugin,
  SettingsPlugin,
  useIntentDispatcher,
} from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Message } from '@dxos/artifact';
import { createStatic, ObjectId } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { DXN, QueueSubspaceTags } from '@dxos/keys';
import { ClientPlugin } from '@dxos/plugin-client';
import { SpacePlugin } from '@dxos/plugin-space';
import { createDocAccessor, type Live, live, makeRef, useQueue, useSpaces } from '@dxos/react-client/echo';
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
import { TextType } from '@dxos/schema';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { MarkdownEditor } from './MarkdownEditor';
import { MarkdownPlugin } from '../MarkdownPlugin';
import translations from '../translations';
import { DocumentType } from '../types';

const PreviewBlock = () => {
  return <div>PreviewBlock</div>;
};

const PreviewCard = () => {
  return <div>PreviewCard</div>;
};

// TODO(burdon): Factor out (reconcile with ThreadContainer.stories.tsx)
const randomQueueDxn = (spaceId: string) =>
  new DXN(DXN.kind.QUEUE, [QueueSubspaceTags.DATA, spaceId, ObjectId.random()]).toString();

const TestChat = ({ content, docId }: { content: string; docId: string }) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const { parentRef } = useTextEditor({ initialValue: content });
  const [space] = useSpaces();
  const [queueDxn] = useState<string>(() => randomQueueDxn(space.id));
  const queue = useQueue<Message>(DXN.tryParse(queueDxn));

  const handleInsert = () => {
    invariant(queue);
    queue.append([createStatic(Message, { role: 'assistant', content: [{ type: 'text', text: 'Hello' }] })]);
    const message = queue.items[queue.items.length - 1];

    void dispatch(
      createIntent(CollaborationActions.InsertContent, {
        label: 'Proposal',
        queueId: queue.dxn.toString(),
        messageId: message.id,
        associatedArtifact: {
          id: docId,
          typename: DocumentType.typename,
          spaceId: space.id,
        },
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

const TestDocument = ({ doc }: { doc: Live<any> }) => {
  const extensions = useMemo(
    () => [
      automerge(createDocAccessor(doc, ['content'])),
      command(),
      preview({
        renderBlock: createRenderer(PreviewBlock),
        onLookup: async () => undefined,
      }),
    ],
    [doc],
  );

  return <MarkdownEditor id='document' initialValue={doc.content} extensions={extensions} toolbar />;
};

const DefaultStory = ({ document, chat }: { document: string; chat: string }) => {
  const [doc, setDoc] = useState<Live<DocumentType>>();
  const [space] = useSpaces();

  useEffect(() => {
    const doc = live(DocumentType, {
      content: makeRef(live(TextType, { content: document ?? '#' })),
      threads: [],
    });
    space.db.add(doc);
    setDoc(doc);
  }, [space]);

  return doc ? (
    <div className='grow grid grid-cols-2 overflow-hidden divide-x divide-separator'>
      <TestDocument doc={doc} />
      <TestChat content={chat} docId={doc!.id} />
    </div>
  ) : (
    <></>
  );
};

const meta: Meta<typeof DefaultStory> = {
  title: 'plugins/plugin-markdown/Suggestions',
  render: DefaultStory,
  decorators: [
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types: [DocumentType],
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
        MarkdownPlugin(),
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
