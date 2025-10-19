//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type FC, useEffect, useMemo, useRef, useState } from 'react';

import { Expando } from '@dxos/echo/internal';
import { live } from '@dxos/echo/internal';
import { createDocAccessor, createObject } from '@dxos/echo-db';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { faker } from '@dxos/random';
import { Button, Icon, useThemeContext } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
import {
  type Comment,
  type CommentsOptions,
  type Range,
  automerge,
  comments,
  createBasicExtensions,
  createThemeExtensions,
  listener,
  scrollThreadIntoView,
  useComments,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { hoverableControls, hoverableFocusedWithinControls } from '@dxos/react-ui-theme';

import { MessageBody, MessageHeading, MessageRoot, MessageTextbox } from '../Message';
import { type MessageEntity } from '../testing';
import { translations } from '../translations';

import { Thread } from './Thread';

faker.seed(101);

const authorId = PublicKey.random().toHex();

//
// Editor
//

const Editor: FC<{
  id?: string;
  item: Expando;
  comments: Comment[];
  selected?: string;
  onCreateComment: CommentsOptions['onCreate'];
  onDeleteComment: CommentsOptions['onDelete'];
  onUpdateComment: CommentsOptions['onUpdate'];
  onSelectComment: CommentsOptions['onSelect'];
}> = ({
  id = 'test',
  item,
  selected: selectedValue,
  comments: commentRanges,
  onCreateComment,
  onDeleteComment,
  onUpdateComment,
  onSelectComment,
}) => {
  const [selected, setSelected] = useState<string>();

  const { themeMode } = useThemeContext();
  const { parentRef, view } = useTextEditor(
    () => ({
      id,
      initialValue: item.content,
      extensions: [
        createBasicExtensions(),
        createThemeExtensions({ themeMode }),
        automerge(createDocAccessor(item, ['content'])),
        comments({
          id,
          onCreate: onCreateComment,
          onDelete: onDeleteComment,
          onUpdate: onUpdateComment,
          onSelect: onSelectComment,
        }),
      ],
    }),
    [id, item, themeMode],
  );
  useComments(view, id, commentRanges);
  useEffect(() => {
    if (view && !view.hasFocus && selectedValue !== selected) {
      setSelected(selectedValue);
      if (selectedValue) {
        scrollThreadIntoView(view, selectedValue);
      }
    }
  }, [view, selected, commentRanges, selectedValue]);

  return <div ref={parentRef} />;
};

//
// Comments thread
//

type StoryCommentThread = {
  id: string;
  cursor?: string;
  range?: Range;
  yPos?: number;
  messages: MessageEntity[];
};

const StoryThread: FC<{
  thread: StoryCommentThread;
  selected: boolean;
  onSelect: () => void;
  onResolve: () => void;
}> = ({ thread, selected, onSelect, onResolve }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { themeMode } = useThemeContext();
  // TODO(wittjosiah): This is a hack to reset the editor after a message is sent.
  const [_count, _setCount] = useState(0);
  const rerenderEditor = () => _setCount((count) => count + 1);
  const messageRef = useRef('');
  const extensions = useMemo(
    () => [
      createBasicExtensions({ placeholder: 'Enter comment' }),
      createThemeExtensions({ themeMode }),
      listener({ onChange: (text) => (messageRef.current = text) }),
    ],
    [themeMode, _count],
  );

  const [autoFocus, setAutoFocus] = useState(false);
  useEffect(() => {
    if (selected) {
      containerRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      if (thread.messages.length === 0) {
        // TODO(burdon): Causes thread to be reselected when loses focus.
        setAutoFocus(true);
      }
    }
  }, [selected]);

  const handleCreateMessage = () => {
    if (messageRef.current?.length) {
      const message = live(Expando, {
        timestamp: new Date().toISOString(),
        sender: { identityKey: authorId },
        text: messageRef.current,
      });
      thread.messages.push(message as any);

      messageRef.current = '';
      setAutoFocus(true);
      rerenderEditor();
    }
  };

  return (
    <Thread.Root current={selected} onClickCapture={onSelect}>
      <div className='col-start-2 flex gap-1 text-xs text-description'>
        <span>id:{thread.id.slice(0, 4)}</span>
        <span>y:{thread.yPos}</span>
        <span className='grow' />
        {!thread.cursor && <Icon icon='ph--trash--regular' />}
      </div>

      <Thread.Header>
        {thread.range?.from} &ndash; {thread.range?.to}
      </Thread.Header>

      {thread.messages.map((message) => (
        <MessageRoot key={message.id} classNames={[hoverableControls, hoverableFocusedWithinControls]} {...message}>
          <MessageHeading authorName={message.authorName} timestamp={message.timestamp} />
          <MessageBody>{message.text}</MessageBody>
        </MessageRoot>
      ))}

      <div ref={containerRef} className='contents'>
        <MessageTextbox
          id={thread.id}
          authorId={authorId}
          autoFocus={autoFocus}
          extensions={extensions}
          onEditorFocus={onSelect}
          onSend={handleCreateMessage}
        />
        <Thread.Status />
        <Button variant='ghost' classNames='px-1' title='Resolve' onClick={onResolve}>
          <Icon icon='ph--check--regular' />
        </Button>
      </div>
    </Thread.Root>
  );
};

const Sidebar: FC<{
  threads: StoryCommentThread[];
  selected?: string;
  onSelect: (thread: string) => void;
  onResolve: (thread: string) => void;
}> = ({ threads, selected, onSelect, onResolve }) => {
  // Sort by y-position.
  const sortedThreads = useMemo(() => {
    const sorted = [...threads];
    return sorted.sort(({ yPos: a = Infinity }, { yPos: b = Infinity }) => {
      return a < b ? -1 : a > b ? 1 : 0;
    });
  }, [threads]);

  return (
    <>
      {sortedThreads.map((thread) => (
        <StoryThread
          key={thread.id}
          thread={thread}
          selected={thread.id === selected}
          onSelect={() => onSelect(thread.id)}
          onResolve={() => onResolve(thread.id)}
        />
      ))}
    </>
  );
};

//
// Story container.
//

type StoryProps = {
  text?: string;
  autoCreate?: boolean;
};

const DefaultStory = ({ text, autoCreate }: StoryProps) => {
  const [item] = useState(createObject(live(Expando, { content: text ?? '' })));
  const [threads, setThreads] = useState<StoryCommentThread[]>([]);
  const [selected, setSelected] = useState<string>();

  const comments = useMemo<Comment[]>(() => threads.map(({ id, cursor }) => ({ id, cursor })), [threads]);

  // Filter by visibility.
  const visibleThreads = useMemo(() => threads.filter((thread) => thread.yPos !== undefined), [threads]);

  const handleCreateComment: CommentsOptions['onCreate'] = ({ cursor, location }) => {
    const id = PublicKey.random().toHex();
    log.info('create', { id: id.slice(0, 4), cursor });
    setThreads((threads) => [
      ...threads,
      {
        id,
        cursor,
        yPos: location ? Math.floor(location.top) : undefined,
        messages: autoCreate
          ? faker.helpers.multiple(
              () => ({
                id: PublicKey.random().toHex(),
                timestamp: new Date().toISOString(),
                authorId: PublicKey.random().toHex(),
                text: faker.lorem.sentence(),
              }),
              { count: { min: 1, max: 3 } },
            )
          : [],
      },
    ]);

    return id;
  };

  const handleDeleteComment: CommentsOptions['onDelete'] = ({ id }) => {
    log.info('delete', { id: id.slice(0, 4) });
    setThreads((threads) =>
      threads.map((thread) => {
        if (thread.id === id) {
          thread.cursor = undefined;
        }

        return thread;
      }),
    );

    setSelected((selected) => (selected === id ? undefined : selected));
  };

  const handleUpdateComment: CommentsOptions['onUpdate'] = ({ id, cursor }) => {
    log.info('update', { id: id.slice(0, 4), cursor });
    setThreads((threads) =>
      threads.map((thread) => {
        if (thread.id === id) {
          thread.cursor = cursor;
        }

        return thread;
      }),
    );
  };

  const handleSelectComment: CommentsOptions['onSelect'] = ({ comments, selection: { current, closest } }) => {
    log.info('select', { active: current?.slice(0, 4), closest: closest?.slice(0, 4) });
    setThreads((threads) =>
      threads.map((thread) => {
        const comment = comments.find(({ comment }) => comment.id === thread.id);
        if (comment) {
          thread.yPos = comment.location ? Math.floor(comment.location.top) : undefined;
          thread.range = { from: comment.range.from, to: comment.range.to };
        }

        return thread;
      }),
    );

    setSelected(current);
  };

  // TODO(burdon): Focus switches to other thread.
  const handleSelectThread = (id: string) => {
    setSelected(id);
  };

  const handleResolveThread = (id: string) => {
    setThreads((threads) => [...threads.filter((thread) => thread.id !== id)]);
    setSelected(undefined);
  };

  return (
    <main className='fixed inset-0 grid grid-cols-[1fr_24rem]'>
      <div role='none' className='max-bs-full overflow-y-auto p-4'>
        <Editor
          item={item}
          selected={selected}
          comments={comments}
          onCreateComment={handleCreateComment}
          onDeleteComment={handleDeleteComment}
          onUpdateComment={handleUpdateComment}
          onSelectComment={handleSelectComment}
        />
      </div>

      <div role='none' className='max-bs-full overflow-y-auto p-4'>
        <Sidebar
          threads={visibleThreads}
          selected={selected}
          onSelect={handleSelectThread}
          onResolve={handleResolveThread}
        />
      </div>
    </main>
  );
};

const meta = {
  title: 'ui/react-ui-thread/Comments',
  component: StoryThread as any,
  render: DefaultStory,
  decorators: [withTheme],
  parameters: {
    translations,
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

const str = (...lines: string[]) => lines.join('\n');

export const Default: Story = {
  args: {
    text: str(
      '# Comments',
      '',
      str(...faker.helpers.multiple(() => [faker.lorem.paragraph({ min: 5, max: 10 }), ''], { count: 20 }).flat()),
      '',
    ),
  },
};
