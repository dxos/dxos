//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React, { type FC, useMemo, useState } from 'react';

import {
  Capabilities,
  CollaborationActions,
  contributes,
  createIntent,
  createResolver,
  createSurface,
  IntentPlugin,
  SettingsPlugin,
  Surface,
  useIntentDispatcher,
} from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Message } from '@dxos/artifact';
import { createStatic, ObjectId, S, AST } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { DXN, QueueSubspaceTags, SpaceId } from '@dxos/keys';
import { ClientPlugin } from '@dxos/plugin-client';
import { SpacePlugin } from '@dxos/plugin-space';
import { faker } from '@dxos/random';
import { createDocAccessor, createObject, useQueue } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { IconButton, Popover, Toolbar } from '@dxos/react-ui';
import {
  automerge,
  command,
  createRenderer,
  translations as editorTranslations,
  preview,
  RefPopover,
  useTextEditor,
  type PreviewLinkRef,
  type PreviewLinkTarget,
  useRefPopover,
} from '@dxos/react-ui-editor';
import { Form } from '@dxos/react-ui-form';
import { StackItem } from '@dxos/react-ui-stack';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { MarkdownEditor } from './MarkdownEditor';
import translations from '../translations';

// Sample schema for ViewEditor
const TaskSchema = S.Struct({
  title: S.String.annotations({
    [AST.TitleAnnotationId]: 'Title',
    [AST.DescriptionAnnotationId]: 'Task title',
  }),
  description: S.String.annotations({
    [AST.TitleAnnotationId]: 'Description',
    [AST.DescriptionAnnotationId]: 'Task description',
  }),
}).pipe(S.mutable);

// Handler to resolve dxn:queue:data:123 to random data conforming to the schema
const handlePreviewLookup = async (link: PreviewLinkRef): Promise<PreviewLinkTarget> => {
  // Check if the link is for our specific data
  if (link.dxn === 'dxn:queue:data:123') {
    // Seed the faker to get consistent results for the same link
    faker.seed(link.dxn.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 1));

    // Generate random data conforming to the schema
    const data = {
      schema: TaskSchema,
      values: {
        title: faker.lorem.sentence(),
        description: faker.lorem.paragraph(),
      },
    };

    return {
      label: link.label,
      text: JSON.stringify(data.values, null, 2),
      data,
    };
  }

  // For other links, return a simple text response
  return {
    label: link.label,
    text: `Data for ${link.dxn}`,
  };
};

const PreviewBlock = () => {
  return <div>PreviewBlock</div>;
};

const PreviewCard = () => {
  const { target } = useRefPopover('PreviewCard');
  return (
    <Popover.Portal>
      <Popover.Content onOpenAutoFocus={(event) => event.preventDefault()}>
        <Popover.Viewport>{target?.data && <Surface role='preview' data={target.data} />}</Popover.Viewport>
        <Popover.Arrow />
      </Popover.Content>
    </Popover.Portal>
  );
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
    queue.append([createStatic(Message, { role: 'assistant', content: [{ type: 'text', text: 'Hello' }] })]);
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
        onLookup: handlePreviewLookup,
      }),
    ],
    [doc],
  );

  return <MarkdownEditor id='document' initialValue={doc.content} extensions={extensions} toolbar />;
};

const DefaultStory = ({ document, chat }: { document: string; chat: string }) => {
  return (
    <RefPopover.Root onLookup={handlePreviewLookup}>
      <div className='grow grid grid-cols-2 overflow-hidden divide-x divide-separator'>
        <TestDocument content={document} />
        <TestChat content={chat} />
      </div>
      <PreviewCard />
    </RefPopover.Root>
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
      capabilities: [
        contributes(
          Capabilities.ReactSurface,
          createSurface({
            id: 'preview-test',
            role: 'preview',
            component: ({ role, data }) => <Form schema={data.schema} values={data.values} />,
          }),
        ),
        contributes(
          Capabilities.IntentResolver,
          createResolver({
            intent: CollaborationActions.InsertContent,
            resolve: (input) => {
              console.log('[inset content intent]', input);
            },
          }),
        ),
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
    document: '# Test\n\n[DXOS][dxn:queue:data:123]',
    chat: 'Hello\n',
  },
};
