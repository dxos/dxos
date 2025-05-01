//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React, { type FC, useEffect, useMemo, useState } from 'react';

import {
  Capabilities,
  CollaborationActions,
  IntentPlugin,
  SettingsPlugin,
  Surface,
  contributes,
  createIntent,
  createSurface,
  useIntentDispatcher,
} from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Message } from '@dxos/artifact';
import { S, AST, create, type Expando, EchoObject, getSchema } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';
import { live, makeRef, refFromDXN } from '@dxos/live-object';
import { ClientPlugin } from '@dxos/plugin-client';
import { SpacePlugin } from '@dxos/plugin-space';
import { ThemePlugin } from '@dxos/plugin-theme';
import { faker } from '@dxos/random';
import { type Client, resolveRef } from '@dxos/react-client';
import { useClient } from '@dxos/react-client';
import { type Space, createDocAccessor, getSpace, randomQueueDxn, useQueue, useSpace } from '@dxos/react-client/echo';
import { IconButton, Popover, Toolbar } from '@dxos/react-ui';
import {
  type Extension,
  type PreviewLinkRef,
  type PreviewLinkTarget,
  RefPopover,
  automerge,
  command,
  preview,
  useTextEditor,
  useRefPopover,
} from '@dxos/react-ui-editor';
import { Form } from '@dxos/react-ui-form';
import { StackItem } from '@dxos/react-ui-stack';
import { defaultTx } from '@dxos/react-ui-theme';
import { withLayout } from '@dxos/storybook-utils';
import { isNotFalsy } from '@dxos/util';

import { MarkdownEditor } from './MarkdownEditor';
import { MarkdownPlugin } from '../MarkdownPlugin';
import translations from '../translations';
import { createDocument, DocumentType } from '../types';

faker.seed(1);

const TestItem = S.Struct({
  title: S.String.annotations({
    [AST.TitleAnnotationId]: 'Title',
    [AST.DescriptionAnnotationId]: 'Product title',
  }),
  description: S.String.annotations({
    [AST.TitleAnnotationId]: 'Description',
    [AST.DescriptionAnnotationId]: 'Product description',
  }),
}).pipe(EchoObject({ typename: 'dxos.org/type/Test', version: '0.1.0' }));

const handlePreviewLookup = async (
  client: Client,
  defaultSpace: Space,
  { ref, label }: PreviewLinkRef,
): Promise<PreviewLinkTarget | null> => {
  const dxn = DXN.parse(ref);
  if (!dxn) {
    return null;
  }

  const object = await resolveRef(client, dxn, defaultSpace);
  return { label, object };
};

const PreviewCard = () => {
  const { target } = useRefPopover('PreviewCard');
  return (
    <Popover.Content
      onOpenAutoFocus={(event) => event.preventDefault()}
      classNames='popover-max-width z-0'
      collisionPadding={48}
    >
      <Popover.Viewport>{target?.object && <Surface role='preview' data={target.object} />}</Popover.Viewport>
      <Popover.Arrow />
    </Popover.Content>
  );
};

const TestChat: FC<{ doc: DocumentType; content: string }> = ({ doc, content }) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const { parentRef } = useTextEditor({ initialValue: content });

  const space = useSpace();
  const queueDxn = useMemo(() => space && randomQueueDxn(space.id), [space]);
  const queue = useQueue<Message>(queueDxn);

  const handleInsert = () => {
    invariant(space);
    invariant(queue);
    queue.append([create(Message, { role: 'assistant', content: [{ type: 'text', text: 'Hello' }] })]);
    const message = queue.items[queue.items.length - 1];

    // {
    //   const ref = refFromDXN(new DXN(DXN.kind.QUEUE, [...queue.dxn.parts, message.id]));

    //   const message = deref(ref);
    // }

    void dispatch(
      createIntent(CollaborationActions.InsertContent, {
        spaceId: space.id,
        target: makeRef(doc as any as Expando), // TODO(burdon): Comomon base type.
        object: refFromDXN(new DXN(DXN.kind.QUEUE, [...queue.dxn.parts, message.id])),
        label: 'Proposal',
      }),
    );
  };

  return (
    <StackItem.Content toolbar classNames='w-full'>
      <Toolbar.Root classNames='border-be border-separator'>
        <IconButton icon='ph--plus--regular' disabled={!queue} label='Insert' onClick={handleInsert} />
      </Toolbar.Root>
      <div ref={parentRef} className='p-4' />
    </StackItem.Content>
  );
};

const TestDocument: FC<{ doc: DocumentType }> = ({ doc }) => {
  const client = useClient();
  const extensions = useMemo<Extension[]>(() => {
    const space = getSpace(doc);
    return [
      automerge(createDocAccessor(doc, ['content'])),
      command(),
      space &&
        preview({
          onLookup: (link) => handlePreviewLookup(client, space, link),
        }),
    ].filter(isNotFalsy);
  }, [doc]);

  return <MarkdownEditor id='document' initialValue={doc.content?.target?.content} extensions={extensions} toolbar />;
};

const DefaultStory = ({ document, chat }: { document: string; chat: string }) => {
  const client = useClient();
  const space = useSpace();
  const [doc, setDoc] = useState<DocumentType>();

  useEffect(() => {
    if (!space) {
      return undefined;
    }

    const doc = space.db.add(
      createDocument({
        name: 'Test',

        // Create links.
        content: document.replaceAll(/\[(\w+)\]/g, (_, label) => {
          const obj = space.db.add(live(TestItem, { title: label, description: faker.lorem.paragraph() }));
          const dxn = makeRef(obj).dxn.toString();
          return `[${label}][${dxn}]`;
        }),
      }),
    );

    setDoc(doc);
  }, [space]);

  if (!space || !doc) {
    return <></>;
  }

  return (
    <RefPopover.Provider onLookup={(link) => handlePreviewLookup(client, space, link)}>
      <TestDocument doc={doc} />
      <TestChat doc={doc} content={chat} />
      <PreviewCard />
    </RefPopover.Provider>
  );
};

const meta: Meta<typeof DefaultStory> = {
  title: 'plugins/plugin-markdown/Suggestions',
  render: DefaultStory,
  decorators: [
    withPluginManager({
      plugins: [
        ThemePlugin({ tx: defaultTx }),
        ClientPlugin({
          types: [DocumentType, TestItem],
          onClientInitialized: async (_, client) => {
            await client.halo.createIdentity();
          },
        }),
        SpacePlugin(),
        SettingsPlugin(),
        IntentPlugin(),
        MarkdownPlugin(),
      ],
      capabilities: [
        contributes(
          Capabilities.ReactSurface,
          createSurface({
            id: 'preview-test',
            role: 'preview',
            component: ({ data }) => {
              const schema = getSchema(data);
              if (!schema) {
                return null;
              }

              return <Form schema={schema} values={data} />;
            },
          }),
        ),
      ],
    }),
    withLayout({ tooltips: true, fullscreen: true, classNames: 'grid grid-cols-2' }),
  ],
  parameters: {
    translations,
  },
};

export default meta;

type Story = Meta<typeof DefaultStory>;

export const Default: Story = {
  args: {
    chat: 'Hello\n',
    document: [
      '# Test',
      '',
      faker.lorem.paragraph(1),
      '',
      'This is a [DXOS] story that tests [ECHO] references inside the Markdown plugin.',
      '',
      faker.lorem.paragraph(3),
      '',
    ].join('\n'),
  },
};
