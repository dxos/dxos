//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { Check, Trash } from '@phosphor-icons/react';
import React, { type FC, useEffect, useMemo, useRef, useState } from 'react';

import { TextObject } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { faker } from '@dxos/random';
import { Button } from '@dxos/react-ui';
import {
  MarkdownEditor,
  comments,
  type CommentsOptions,
  focusComment,
  useComments,
  type Comment,
  type Range,
  useTextModel,
  type EditorView,
  TextEditor,
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
  item: { text: TextObject };
  comments: Comment[];
  selected?: string;
  onCreateComment: CommentsOptions['onCreate'];
  onDeleteComment: CommentsOptions['onDelete'];
  onUpdateComment: CommentsOptions['onUpdate'];
  onSelectComment: CommentsOptions['onSelect'];
}> = ({
  item,
  selected: selectedValue,
  comments: commentRanges,
  onCreateComment,
  onDeleteComment,
  onUpdateComment,
  onSelectComment,
}) => {
  const model = useTextModel({ text: item.text });
  const view = useRef<EditorView>(null);
  const [selected, setSelected] = useState<string>();
  useEffect(() => {
    if (!view.current?.hasFocus && selectedValue !== selected) {
      setSelected(selectedValue);
      if (selectedValue) {
        focusComment(view.current!, selectedValue);
      }
    }
  }, [selected, commentRanges, selectedValue]);

  useComments(view.current, commentRanges);

  const extensions = useMemo(() => {
    return [
      comments({
        onCreate: onCreateComment,
        onDelete: onDeleteComment,
        onUpdate: onUpdateComment,
        onSelect: onSelectComment,
      }),
    ];
  }, []);

  if (!model) {
    return null;
  }

  // TODO(burdon): Highlight currently selected comment.
  return <MarkdownEditor ref={view} model={model} extensions={extensions} />;
};

//
// Comments thread
//

type StoryCommentThread = {
  id: string;
  cursor?: string;
  range?: Range;
  yPos?: number;
  messages: MessageEntity<{ text: TextObject }>[];
};

const StoryMessageBlock = (props: MessageBlockProps<{ text: TextObject }>) => {
  const model = useTextModel({ text: props.block.text });
  return model ? <TextEditor model={model} slots={{ root: { className: 'col-span-3' } }} /> : null;
};

const StoryThread: FC<{
  thread: StoryCommentThread;
  selected: boolean;
  onSelect: () => void;
  onResolve: () => void;
}> = ({ thread, selected, onSelect, onResolve }) => {
  const [autoFocus, setAutoFocus] = useState(false);
  const [item, setItem] = useState({ text: new TextObject() });
  const model = useTextModel({ text: item.text });
  const editorRef = useRef<EditorView>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected) {
      containerRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      if (thread.messages.length === 0) {
        setAutoFocus(true);
      }
    }
  }, [selected]);

  const handleCreateMessage = () => {
    const text = model?.text().trim();
    if (text?.length) {
      thread.messages.push({
        id: item.text.id,
        authorId,
        blocks: [{ text: item.text, timestamp: new Date().toISOString() }],
      });
      setItem({ text: new TextObject() });
      setAutoFocus(true);
    }
  };

  if (!model) {
    return null;
  }

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
        <Message<{ text: TextObject }> key={message.id} {...message} MessageBlockComponent={StoryMessageBlock} />
      ))}

      <div ref={containerRef} className='contents'>
        <MessageTextbox
          authorId={authorId}
          ref={editorRef}
          autoFocus={autoFocus}
          onEditorFocus={onSelect}
          model={model}
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
  const [item] = useState({ text: new TextObject(text) });
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
                    text: new TextObject(faker.lorem.sentence()),
                  },
                ],
              }),
              { count: { min: 1, max: 3 } },
            )
          : [],
      },
    ]);
    setSelected(id); // TODO(burdon): Not required.
    return id;
  };

  const handleDeleteComment: CommentsOptions['onDelete'] = (id) => {
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

  const handleUpdateComment: CommentsOptions['onUpdate'] = (id, cursor) => {
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

    setSelected(current ?? closest);
  };

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

export const Testing = {
  args: {
    text: document,
    autoCreate: true,
  },
};
