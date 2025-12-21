//
// Copyright 2023 DXOS.org
//

import { type Meta } from '@storybook/react-vite';
import * as Function from 'effect/Function';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import React, { type FC, useEffect, useMemo, useState } from 'react';

import { Capabilities, IntentPlugin, SettingsPlugin } from '@dxos/app-framework';
import { useCapability, useIntentDispatcher } from '@dxos/app-framework/react';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Obj, Ref, Type } from '@dxos/echo';
import { createDocAccessor, toCursorRange } from '@dxos/echo-db';
import { invariant } from '@dxos/invariant';
import { ClientPlugin } from '@dxos/plugin-client';
import { GraphPlugin } from '@dxos/plugin-graph';
import { PreviewPlugin } from '@dxos/plugin-preview';
import { SpacePlugin } from '@dxos/plugin-space';
import { StorybookLayoutPlugin } from '@dxos/plugin-storybook-layout';
import { ThemePlugin } from '@dxos/plugin-theme';
import { faker } from '@dxos/random';
import { useQueue, useSpace } from '@dxos/react-client/echo';
import { IconButton, Toolbar } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
import { type EditorSelection, type Range, useTextEditor } from '@dxos/react-ui-editor';
import { StackItem } from '@dxos/react-ui-stack';
import { defaultTx } from '@dxos/ui-theme';
import { render } from '@dxos/storybook-utils';
import { Message } from '@dxos/types';

import { MarkdownCapabilities } from '../capabilities';
import { MarkdownPlugin } from '../MarkdownPlugin';
import { meta } from '../meta';
import { translations } from '../translations';
import { Markdown } from '../types';

import { MarkdownContainer } from './MarkdownContainer';

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

const TestChat: FC<{ doc: Markdown.Document; content: string }> = ({ doc, content }) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const { parentRef } = useTextEditor({ initialValue: content });
  const { editorState } = useCapability(MarkdownCapabilities.State);

  const space = useSpace();
  const queueDxn = useMemo(() => space && space.queues.create().dxn, [space]);
  const queue = useQueue<Message.Message>(queueDxn);

  const handleInsert = async () => {
    invariant(space);
    invariant(queue);
    await queue.append([
      Obj.make(Message.Message, {
        created: new Date().toISOString(),
        sender: { role: 'assistant' },
        blocks: [{ _tag: 'text', text: 'Hello' }],
      }),
    ]);
    const message = queue.objects.at(-1);
    invariant(message);

    const text = await doc.content.load();
    const accessor = createDocAccessor(text, ['content']);
    const cursor = Function.pipe(
      editorState.getState(Obj.getDXN(doc).toString())?.selection,
      Option.fromNullable,
      Option.map(selectionToRange),
      Option.map((range) => toCursorRange(accessor, range.from, range.to)),
      Option.getOrUndefined,
    );

    // {
    //   const ref = refFromDXN(new DXN(DXN.kind.QUEUE, [...queue.dxn.parts, message.id]));
    //   const message = deref(ref);
    // }

    // void dispatch(
    //   createIntent(CollaborationActions.InsertContent, {
    //     target: doc as any as Type.Expando,
    //     object: Ref.fromDXN(new DXN(DXN.kind.QUEUE, [...queue.dxn.parts, message.id])),
    //     at: cursor,
    //     label: 'Proposal',
    //   }),
    // );
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
  const [doc, setDoc] = useState<Markdown.Document>();
  const settings = useCapability(Capabilities.SettingsStore).getStore<Markdown.Settings>(meta.id)!.value;
  const { editorState } = useCapability(MarkdownCapabilities.State);

  useEffect(() => {
    if (!space) {
      return undefined;
    }

    const doc = space.db.add(
      Markdown.make({
        name: 'Test',
        content: document.replaceAll(/\[(\w+)\]/g, (_, label) => {
          const obj = space.db.add(
            Obj.make(TestItem, {
              title: label,
              description: faker.lorem.paragraph(),
            }),
          );
          const dxn = Ref.make(obj).dxn.toString();
          return `[${label}](${dxn})`;
        }),
      }),
    );

    setDoc(doc);
  }, [space]);

  if (!space || !doc) {
    return null;
  }

  // TODO(burdon): Layout issue.
  return (
    <div className='grid grid-cols-2 bs-full overflow-hidden'>
      <MarkdownContainer id={doc.id} object={doc} settings={settings} editorStateStore={editorState} />
      <TestChat doc={doc} content={chat} />
    </div>
  );
};

const storybook: Meta<typeof DefaultStory> = {
  title: 'plugins/plugin-markdown/Suggestions',
  render: render(DefaultStory),
  decorators: [
    withTheme,
    withPluginManager({
      plugins: [
        ClientPlugin({
          types: [Markdown.Document, TestItem],
          onClientInitialized: async ({ client }) => {
            await client.halo.createIdentity();
          },
        }),
        SpacePlugin({}),
        GraphPlugin(),
        IntentPlugin(),
        SettingsPlugin(),

        // UI
        ThemePlugin({ tx: defaultTx }),
        MarkdownPlugin(),
        PreviewPlugin(),
        StorybookLayoutPlugin({}),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    controls: {
      disable: true,
    },
    translations,
  },
};

export default storybook;

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
