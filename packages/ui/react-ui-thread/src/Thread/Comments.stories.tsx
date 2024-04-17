//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { Check, Trash } from '@phosphor-icons/react';
import React, { type FC, useEffect, useMemo, useRef, useState } from 'react';

import { MessageType, TextV0Type } from '@braneframe/types';
import { createDocAccessor, create, createEchoReactiveObject } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { faker } from '@dxos/random';
import { Button, useThemeContext } from '@dxos/react-ui';
import {
  comments,
  type CommentsOptions,
  focusComment,
  useComments,
  type Comment,
  type Range,
  useTextEditor,
  createBasicExtensions,
  createThemeExtensions,
  automerge,
  listener,
} from '@dxos/react-ui-editor';
import { withTheme } from '@dxos/storybook-utils';

import { Thread, ThreadFooter, ThreadHeading } from './Thread';
import { Message, type MessageBlockProps, MessageTextbox } from '../Message';
import translations from '../translations';
import { type MessageEntity } from '../types';

faker.seed(101);

const authorId = PublicKey.random().toHex();

//
// Editor
//

const Editor: FC<{
  id?: string;
  item: TextV0Type;
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
      doc: item.content,
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
        focusComment(view, selectedValue);
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
  messages: MessageEntity<{ content?: TextV0Type }>[];
};

const StoryMessageBlock = (props: MessageBlockProps<{ content?: TextV0Type }>) => {
  const { themeMode } = useThemeContext();
  const doc = props.block.content?.content;
  const accessor = createDocAccessor(props.block.content!, ['content']);
  const { parentRef } = useTextEditor(
    () => ({
      doc,
      extensions: [
        //
        createBasicExtensions(),
        createThemeExtensions({ themeMode }),
        automerge(accessor),
      ],
    }),
    [doc, accessor, themeMode],
  );

  return <div ref={parentRef} className='col-span-3' />;
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
      const message = create(MessageType, {
        from: { identityKey: authorId },
        blocks: [
          {
            timestamp: new Date().toISOString(),
            content: create(TextV0Type, { content: messageRef.current }),
          },
        ],
      });
      thread.messages.push(message);

      messageRef.current = '';
      setAutoFocus(true);
      rerenderEditor();
    }
  };

  return (
    <Thread current={selected} onClickCapture={onSelect}>
      <div className='col-start-2 flex gap-1 text-xs fg-description'>
        <span>id:{thread.id.slice(0, 4)}</span>
        <span>y:{thread.yPos}</span>
        <span className='grow' />
        {!thread.cursor && <Trash />}
      </div>

      <ThreadHeading>
        {thread.range?.from} &ndash; {thread.range?.to}
      </ThreadHeading>

      {thread.messages.map((message) => (
        <Message<{ content?: TextV0Type }> key={message.id} {...message} MessageBlockComponent={StoryMessageBlock} />
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
        <ThreadFooter />
        <Button variant='ghost' classNames='px-1' title='Resolve' onClick={onResolve}>
          <Check />
        </Button>
      </div>
    </Thread>
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

const Story = ({ text, autoCreate }: StoryProps) => {
  const [item] = useState(createEchoReactiveObject(create(TextV0Type, { content: text ?? '' })));
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
                authorId: PublicKey.random().toHex(),
                blocks: [
                  {
                    timestamp: new Date().toISOString(),
                    content: create(TextV0Type, { content: faker.lorem.sentence() }),
                  },
                ],
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

export default {
  title: 'react-ui-thread/Comments',
  component: StoryThread,
  decorators: [withTheme],
  render: (args: StoryProps) => <Story {...args} />,
  parameters: { translations, layout: 'fullscreen' },
};

const str = (...lines: string[]) => lines.join('\n');

const document = str(
  '# Comments',
  '',
  str(...faker.helpers.multiple(() => [faker.lorem.paragraph({ min: 5, max: 10 }), ''], { count: 20 }).flat()),
  '',
);

export const Default = {
  args: {
    text: document,
  },
};
