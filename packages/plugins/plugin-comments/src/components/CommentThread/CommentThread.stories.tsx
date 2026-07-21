//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useMemo } from 'react';

import { Obj, Ref, Relation } from '@dxos/echo';
import { createObject } from '@dxos/echo-client';
import { type MessageMetadata } from '@dxos/react-ui-thread';
import { translations as threadTranslations } from '@dxos/react-ui-thread/translations';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
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

// CommentThread is space-agnostic: metadata is injected. The story supplies simple resolvers (author
// name from the message sender; a fixed composer author), so no client/space is needed.
const getMetadata = (message: Message.Message): MessageMetadata =>
  getMessageMetadata(Obj.getURI(message), undefined, message.sender);
const authorMetadata: MessageMetadata = { id: 'you', authorName: 'You' };

const Render = () => {
  // Live in-memory ECHO objects (no client): the anchored thread the component subscribes to.
  const { anchor, thread } = useMemo(() => {
    const text = createObject(Text.make({ content: DOCUMENT }));
    const thread = createObject(
      Thread.make({
        name: PHRASE,
        status: 'active',
        messages: [
          Ref.make(message('Alice', 'Should we tighten this opening line?')),
          Ref.make(message('Bob', 'Agreed — it reads a little slow.')),
        ],
      }),
    );
    const start = DOCUMENT.indexOf(PHRASE);
    const anchor = createObject(
      Relation.make(AnchoredTo.AnchoredTo, {
        [Relation.Source]: thread,
        [Relation.Target]: text,
        anchor: `${start}:${start + PHRASE.length}`,
      }),
    );
    return { anchor, thread };
  }, []);

  const onComment = useCallback(
    (_anchor: AnchoredTo.AnchoredTo, text: string) => {
      Obj.update(thread, (thread) => {
        (thread.messages as Ref.Ref<Message.Message>[]).push(Ref.make(message('You', text)));
      });
    },
    [thread],
  );

  const onResolve = useCallback(
    (_anchor: AnchoredTo.AnchoredTo) => {
      Obj.update(thread, (thread) => {
        thread.status = thread.status === 'resolved' ? 'active' : 'resolved';
      });
    },
    [thread],
  );

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
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    translations: [...translations, ...threadTranslations],
  },
} satisfies Meta<typeof Render>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
