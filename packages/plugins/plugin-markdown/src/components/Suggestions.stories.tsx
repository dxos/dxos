//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react-vite';
import { Match, Option, pipe, Schema } from 'effect';
import React, { type FC, useEffect, useMemo, useState } from 'react';

import { Message } from '@dxos/ai';
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
import { Obj, Ref, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';
import { ClientPlugin } from '@dxos/plugin-client';
import { PreviewPlugin } from '@dxos/plugin-preview';
import { SpacePlugin } from '@dxos/plugin-space';
import { StorybookLayoutPlugin } from '@dxos/plugin-storybook-layout';
import { ThemePlugin } from '@dxos/plugin-theme';
import { faker } from '@dxos/random';
import { createDocAccessor, fullyQualifiedId, toCursorRange, useQueue, useSpace } from '@dxos/react-client/echo';
import { IconButton, Toolbar } from '@dxos/react-ui';
import { command, type EditorSelection, type Range, useTextEditor } from '@dxos/react-ui-editor';
import { StackItem } from '@dxos/react-ui-stack';
import { defaultTx } from '@dxos/react-ui-theme';
import { withLayout } from '@dxos/storybook-utils';

import MarkdownContainer from './MarkdownContainer';
import { MarkdownPlugin } from '../MarkdownPlugin';
import { MarkdownCapabilities } from '../capabilities';
import { MARKDOWN_PLUGIN } from '../meta';
import { translations } from '../translations';
import { createDocument, DocumentType, type MarkdownSettingsProps } from '../types';

faker.seed(1);

const TestItem = Schema.Struct({
  title: Schema.String.annotations({
    title: 'Title',
    description: 'Product title',
  }),
  description: Schema.String.annotations({
    title: 'Description',
    description: 'Product description',
  }),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Test',
    version: '0.1.0',
  }),
);

const TestChat: FC<{ doc: DocumentType; content: string }> = ({ doc, content }) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const { parentRef } = useTextEditor({ initialValue: content });
  const { editorState } = useCapability(MarkdownCapabilities.State);

  const space = useSpace();
  const queueDxn = useMemo(() => space && space.queues.create().dxn, [space]);
  const queue = useQueue<Message>(queueDxn);

  const handleInsert = async () => {
    invariant(space);
    invariant(queue);
    await queue.append([Obj.make(Message, { role: 'assistant', content: [{ type: 'text', text: 'Hello' }] })]);
    const message = queue.objects.at(-1);
    invariant(message);

    const text = await doc.content.load();
    const accessor = createDocAccessor(text, ['content']);
    const cursor = pipe(
      editorState.getState(fullyQualifiedId(doc))?.selection,
      Option.fromNullable,
      Option.map(selectionToRange),
      Option.map((range) => toCursorRange(accessor, range.from, range.to)),
      Option.getOrUndefined,
    );

    // {
    //   const ref = refFromDXN(new DXN(DXN.kind.QUEUE, [...queue.dxn.parts, message.id]));
    //   const message = deref(ref);
    // }

    void dispatch(
      createIntent(CollaborationActions.InsertContent, {
        target: doc as any as Type.Expando,
        object: Ref.fromDXN(new DXN(DXN.kind.QUEUE, [...queue.dxn.parts, message.id])),
        at: cursor,
        label: 'Proposal',
      }),
    );
  };

  return (
    <StackItem.Content toolbar>
      <Toolbar.Root>
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
  const { editorState } = useCapability(MarkdownCapabilities.State);

  useEffect(() => {
    if (!space) {
      return undefined;
    }

    const doc = space.db.add(
      createDocument({
        name: 'Test',

        // Create links.
        content: document.replaceAll(/\[(\w+)\]/g, (_, label) => {
          const obj = space.db.add(Obj.make(TestItem, { title: label, description: faker.lorem.paragraph() }));
          const dxn = Ref.make(obj).dxn.toString();
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
      <MarkdownContainer id={doc.id} object={doc} settings={settings} editorStateStore={editorState} />
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
    withLayout({ fullscreen: true, classNames: 'grid grid-cols-2' }),
  ],
  parameters: {
    translations,
    controls: { disable: true },
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

// TODO(wittjosiah): Factor out.
const selectionToRange = Match.type<EditorSelection>().pipe(
  Match.when(
    ({ head, anchor }) => (head ? head > anchor : false),
    ({ head, anchor }) => ({ from: anchor, to: head! }) as Range,
  ),
  Match.when(
    ({ head, anchor }) => (head ? head < anchor : false),
    ({ head, anchor }) => ({ from: head!, to: anchor }) as Range,
  ),
  Match.orElse(({ anchor }) => ({ from: anchor, to: anchor }) as Range),
);
