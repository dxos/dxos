//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { type EditorView, keymap } from '@codemirror/view';
import { faker } from '@faker-js/faker';
import { Check } from '@phosphor-icons/react';
import React, { type FC, useEffect, useMemo, useRef, useState } from 'react';

import { TextObject } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { Button, DensityProvider } from '@dxos/react-ui';
import { fixedInsetFlexLayout, mx } from '@dxos/react-ui-theme';
import { withTheme } from '@dxos/storybook-utils';

import { MarkdownEditor, TextEditor } from './TextEditor';
import { comments, type CommentsOptions, Cursor } from '../../extensions';
import { type CommentRange, type Range, useFocus, useTextModel } from '../../hooks';

faker.seed(101);

//
// Editor
//

const Editor: FC<{
  item: { text: TextObject };
  commentSelected?: string;
  commentRanges: CommentRange[];
  onCreateComment: CommentsOptions['onCreate'];
  onSelectComment: CommentsOptions['onSelect'];
}> = ({ item, commentSelected, commentRanges, onCreateComment, onSelectComment }) => {
  const model = useTextModel({ text: item.text });
  const editorRef = useRef<EditorView>(null);
  const [selected, setSelected] = useState<string>();
  useEffect(() => {
    if (!editorRef.current?.hasFocus && commentSelected !== selected) {
      const thread = commentRanges.find((range) => range.id === commentSelected);
      if (thread) {
        const { cursor } = thread;
        const range = Cursor.getRangeFromCursor(editorRef.current!.state.facet(Cursor.converter), cursor);
        if (range) {
          // TODO(burdon): Scroll selection to center of screen?
          editorRef.current?.dispatch({ selection: { anchor: range.from }, scrollIntoView: true });
        }
      }

      setSelected(commentSelected);
    }
  }, [selected, commentRanges, commentSelected]);

  const extensions = useMemo(() => {
    return [
      comments({
        onCreate: onCreateComment,
        onSelect: onSelectComment,
      }),
    ];
  }, []);

  if (!model) {
    return null;
  }

  // TODO(burdon): Highlight currently selected comment.
  return (
    <div className='flex grow overflow-y-scroll'>
      <MarkdownEditor ref={editorRef} model={model} comments={commentRanges} extensions={extensions} />
    </div>
  );
};

//
// Comments thread
//

type CommentThread = {
  id: string;
  range: CommentRange;
  yPos?: number;
  selection?: Range;
  messages: TextObject[];
};

const Thread: FC<{
  thread: CommentThread;
  selected: boolean;
  onSelect: () => void;
  onResolve: () => void;
}> = ({ thread, selected, onSelect, onResolve }) => {
  const [item, setItem] = useState({ text: new TextObject() });
  const model = useTextModel({ text: item.text });
  const editorRef = useRef<EditorView>(null);

  // TODO(burdon): Tie editor to model.
  const { focus, ready } = useFocus();

  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (selected) {
      containerRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      if (thread.messages.length === 0) {
        focus('_new');
      }
    }
  }, [selected]);

  const handleCreateMessage = () => {
    const text = model?.text().trim();
    if (text?.length) {
      thread.messages.push(item.text);
      const newItem = { text: new TextObject() };
      setItem(newItem);
      // focus(newItem.id);
    }
  };

  if (!model) {
    return null;
  }

  return (
    <div className={mx('flex flex-col m-1 rounded shadow divide-y bg-white', selected && 'ring')}>
      <div className='flex p-2 text-xs font-mono gap-2 text-neutral-500 font-thin'>
        <span>id:{thread.id.slice(0, 4)}</span>
        <span>from:{thread.selection?.from}</span>
        <span>to:{thread.selection?.to}</span>
        <span>y:{thread.yPos}</span>
      </div>

      {thread.messages.map((message, i) => (
        // TODO(burdon): Fix default editor padding so content doesn't jump on creating message.
        <div key={i} className='p-2' onClick={() => onSelect()}>
          {message.text}
        </div>
      ))}

      <div ref={containerRef} onClick={() => onSelect()} className='flex py-1'>
        <div className='grow'>
          <TextEditor
            ref={editorRef}
            model={model}
            placeholder={'Enter comment...'}
            extensions={[
              keymap.of([
                {
                  key: 'Enter',
                  run: () => {
                    handleCreateMessage();
                    return true;
                  },
                },
              ]),
            ]}
            onReady={ready}
          />
        </div>
        <Button variant='ghost' classNames='px-1 mr-1' title='Resolve' onClick={onResolve}>
          <Check />
        </Button>
      </div>
    </div>
  );
};

const Sidebar: FC<{
  threads: CommentThread[];
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
    <DensityProvider density='fine'>
      <div className='flex flex-col grow overflow-y-scroll py-4 gap-4 pr-4'>
        {sortedThreads.map((thread) => (
          <Thread
            key={thread.id}
            thread={thread}
            selected={thread.id === selected}
            onSelect={() => onSelect(thread.id)}
            onResolve={() => onResolve(thread.id)}
          />
        ))}
      </div>
    </DensityProvider>
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
  const [threads, setThreads] = useState<CommentThread[]>([]);
  const commentRanges = useMemo(() => threads.map((thread) => thread.range), [threads]);
  const [selected, setSelected] = useState<string>();

  // Filter by visibility.
  const visibleThreads = useMemo(() => threads.filter((thread) => thread.yPos !== undefined), [threads]);

  const handleCreateComment: CommentsOptions['onCreate'] = (cursor, location) => {
    const id = PublicKey.random().toHex();
    setThreads((threads) => [
      ...threads,
      {
        id,
        range: { id, cursor },
        yPos: location ? Math.floor(location.top) : undefined,
        messages: autoCreate
          ? faker.helpers.multiple(() => new TextObject(faker.lorem.sentence()), { count: { min: 2, max: 5 } })
          : [],
      },
    ]);
    setSelected(id);
    return id;
  };

  // TODO(burdon): Scroll sidebar on select.
  const handleSelectComment: CommentsOptions['onSelect'] = ({ active, closest, ranges }) => {
    setThreads((threads) =>
      threads.map((thread) => {
        const range = ranges.find((range) => range.id === thread.range.id);
        if (range) {
          thread.yPos = range.location ? Math.floor(range.location.top) : undefined;
          thread.selection = { from: range.from, to: range.to };
        }

        return thread;
      }),
    );

    setSelected(active ?? closest);
  };

  const handleSelectThread = (id: string) => {
    setSelected(id);
  };

  const handleResolveThread = (id: string) => {
    setThreads((threads) => [...threads.filter((thread) => thread.id !== id)]);
    setSelected(undefined);
  };

  return (
    <div className={mx(fixedInsetFlexLayout, 'bg-neutral-100')}>
      <div className='flex justify-center h-full gap-8'>
        <div className='flex flex-col h-full w-[600px]'>
          <Editor
            item={item}
            commentSelected={selected}
            commentRanges={commentRanges}
            onCreateComment={handleCreateComment}
            onSelectComment={handleSelectComment}
          />
        </div>

        <div className='flex flex-col h-full w-[300px]'>
          <Sidebar
            threads={visibleThreads}
            selected={selected}
            onSelect={handleSelectThread}
            onResolve={handleResolveThread}
          />
        </div>
      </div>
    </div>
  );
};

export default {
  title: 'react-ui-editor/comments',
  component: MarkdownEditor,
  decorators: [withTheme],
  render: (args: StoryProps) => <Story {...args} />,
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

export const Demo = {
  args: {
    text: document,
    autoCreate: true,
  },
};
