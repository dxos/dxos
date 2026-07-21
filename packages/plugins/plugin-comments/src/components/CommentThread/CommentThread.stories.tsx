//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useCallback } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Filter, Obj, Ref, Relation } from '@dxos/echo';
import { toCursorRange } from '@dxos/echo-client';
import { Doc } from '@dxos/echo-doc';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { useSpaces } from '@dxos/react-client/echo';
import { type MessageMetadata } from '@dxos/react-ui-thread';
import { translations as threadTranslations } from '@dxos/react-ui-thread/translations';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import { AnchoredTo, Message, Thread } from '@dxos/types';

import { translations } from '../../translations';
import { getMessageMetadata } from '../../util';
import { CommentThread } from './CommentThread';

const DOCUMENT = 'The quick brown fox jumps over the lazy dog.';
const PHRASE = 'quick brown fox';

const message = (name: string, text: string): Message.Message =>
  Obj.make(Message.Message, {
    created: new Date().toISOString(),
    sender: { role: 'user', name },
    blocks: [{ _tag: 'text', text }],
  });

// CommentThread is space-agnostic: the container injects author metadata. The story supplies simple
// resolvers (author name from the message sender; a fixed composer author).
const getMetadata = (message: Message.Message): MessageMetadata =>
  getMessageMetadata(Obj.getURI(message), undefined, message.sender);
const authorMetadata: MessageMetadata = { id: 'you', authorName: 'You' };

const threadOf = (anchor: AnchoredTo.AnchoredTo): Thread.Thread | undefined => {
  const source = Relation.getSource(anchor);
  return Obj.instanceOf(Thread.Thread, source) ? source : undefined;
};

const Render = () => {
  const [space] = useSpaces();
  const [anchor] = useQuery(space?.db, Filter.type(AnchoredTo.AnchoredTo));

  const onComment = useCallback((anchor: AnchoredTo.AnchoredTo, text: string) => {
    const thread = threadOf(anchor);
    if (thread) {
      Obj.update(thread, (thread) => {
        (thread.messages as Ref.Ref<Message.Message>[]).push(Ref.make(message('You', text)));
      });
    }
  }, []);

  const onResolve = useCallback((anchor: AnchoredTo.AnchoredTo) => {
    const thread = threadOf(anchor);
    if (thread) {
      Obj.update(thread, (thread) => {
        thread.status = thread.status === 'resolved' ? 'active' : 'resolved';
      });
    }
  }, []);

  if (!anchor) {
    return <Loading data={{ anchor: !!anchor }} />;
  }

  return (
    <div className='w-96 border-ie border-separator'>
      <CommentThread
        anchor={anchor}
        components={{}}
        getMetadata={getMetadata}
        authorMetadata={authorMetadata}
        onComment={onComment}
        onResolve={onResolve}
      />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-comments/components/CommentThread',
  render: Render,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withPluginManager(() => ({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Text.Text, Thread.Thread, Message.Message, AnchoredTo.AnchoredTo],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);
              const text = personalSpace.db.add(Text.make({ content: DOCUMENT }));
              const start = DOCUMENT.indexOf(PHRASE);
              const anchor = toCursorRange(Doc.createAccessor(text, ['content']), start, start + PHRASE.length);
              const thread = personalSpace.db.add(
                Thread.make({
                  name: PHRASE,
                  status: 'active',
                  messages: [
                    Ref.make(message('Alice', 'Should we tighten this opening line?')),
                    Ref.make(message('Bob', 'Agreed — it reads a little slow.')),
                  ],
                }),
              );
              personalSpace.db.add(
                Relation.make(AnchoredTo.AnchoredTo, {
                  [Relation.Source]: thread,
                  [Relation.Target]: text,
                  anchor,
                }),
              );
              yield* Effect.promise(() => personalSpace.db.flush({ indexes: true }));
            }),
        }),
      ],
    })),
  ],
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    translations: [...translations, ...threadTranslations],
  },
} satisfies Meta<typeof Render>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A single anchored comment thread with two messages, rendered on the react-ui-thread primitives. */
export const Default: Story = {};
