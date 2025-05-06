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
  contributes,
  createIntent,
  useCapability,
  useIntentDispatcher,
} from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Message } from '@dxos/artifact';
import { S, AST, create, type Expando, EchoObject } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';
import { live, makeRef, refFromDXN } from '@dxos/live-object';
import { ClientPlugin } from '@dxos/plugin-client';
import { PreviewPlugin } from '@dxos/plugin-preview';
import { SpacePlugin } from '@dxos/plugin-space';
import { StorybookLayoutPlugin } from '@dxos/plugin-storybook-layout';
import { ThemePlugin } from '@dxos/plugin-theme';
import { faker } from '@dxos/random';
import { createQueueDxn, useQueue, useSpace } from '@dxos/react-client/echo';
import { IconButton, Toolbar } from '@dxos/react-ui';
import { command, useTextEditor } from '@dxos/react-ui-editor';
import { StackItem } from '@dxos/react-ui-stack';
import { defaultTx } from '@dxos/react-ui-theme';
import { withLayout } from '@dxos/storybook-utils';

import MarkdownContainer from './MarkdownContainer';
import { MarkdownPlugin } from '../MarkdownPlugin';
import { MarkdownCapabilities } from '../capabilities';
import { MARKDOWN_PLUGIN } from '../meta';
import translations from '../translations';
import { createDocument, DocumentType, type MarkdownSettingsProps } from '../types';

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

const TestChat: FC<{ doc: DocumentType; content: string }> = ({ doc, content }) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const { parentRef } = useTextEditor({ initialValue: content });

  const space = useSpace();
  const queueDxn = useMemo(() => space && createQueueDxn(space.id), [space]);
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

const DefaultStory = ({ document, chat }: { document: string; chat: string }) => {
  const space = useSpace();
  const [doc, setDoc] = useState<DocumentType>();
  const settings = useCapability(Capabilities.SettingsStore).getStore<MarkdownSettingsProps>(MARKDOWN_PLUGIN)!.value;

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
    <>
      <MarkdownContainer id={doc.id} object={doc} settings={settings} />
      <TestChat doc={doc} content={chat} />
    </>
  );
};

const meta: Meta<typeof DefaultStory> = {
  title: 'plugins/plugin-markdown/Suggestions',
  render: DefaultStory,
  decorators: [
    withPluginManager({
      plugins: [
        ThemePlugin({ tx: defaultTx }),
        StorybookLayoutPlugin(),
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
        PreviewPlugin(),
      ],
      capabilities: [contributes(MarkdownCapabilities.Extensions, [() => command()])],
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
