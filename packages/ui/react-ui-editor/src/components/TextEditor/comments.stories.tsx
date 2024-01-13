//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import { type EditorView, keymap } from '@codemirror/view';
import { faker } from '@faker-js/faker';
import React, { type FC, useMemo, useRef, useState } from 'react';

import { TextObject } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { fixedInsetFlexLayout, mx } from '@dxos/react-ui-theme';
import { withTheme } from '@dxos/storybook-utils';

import { MarkdownEditor, TextEditor } from './TextEditor';
import { comments, type CommentsOptions } from '../../extensions';
import { type CommentRange, useTextModel } from '../../hooks';

faker.seed(101);

//
// Editor
//

const Editor: FC<{
  item: { text: TextObject };
  commentRanges: CommentRange[];
  onCreateComment: CommentsOptions['onCreate'];
  onSelectComment: CommentsOptions['onSelect'];
}> = ({ item, commentRanges, onCreateComment, onSelectComment }) => {
  const model = useTextModel({ text: item.text });
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

  return (
    <div className='flex grow overflow-y-scroll'>
      <MarkdownEditor
        model={model}
        comments={commentRanges}
        extensions={extensions}
        slots={{
          editor: {
            // TODO(burdon): Fix default theme (classes currently applied to outer div).
            theme: {
              '&, & .cm-scroller': {
                backgroundColor: 'white',
              },
            },
          },
        }}
      />
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
  messages: TextObject[];
};

const Thread: FC<{
  thread: CommentThread;
  selected: boolean;
  onSelect: () => void;
}> = ({ thread, selected, onSelect }) => {
  const [item, setItem] = useState({ text: new TextObject() });
  const model = useTextModel({ text: item.text });
  const editorRef = useRef<EditorView>(null);

  const handleCreateMessage = () => {
    const text = model?.text().trim();
    if (text?.length) {
      thread.messages.push(item.text);
      setItem({ text: new TextObject() });
      // TODO(burdon): Focus is lost when rendered.
      // editorRef.current?.dispatch({ selection: { anchor: 0, head: 0 } });
      // editorRef.current?.focus();
    }
  };

  if (!model) {
    return null;
  }

  return (
    <div className={mx('flex flex-col m-1 shadow-sm divide-y bg-white', selected && 'ring')}>
      {thread.messages.map((message, i) => (
        // TODO(burdon): Fix default editor padding so content doesn't jump on creating message.
        <div key={i} className='p-2' onClick={() => onSelect()}>
          {message.text}
        </div>
      ))}

      <div onClick={() => onSelect()}>
        <TextEditor
          ref={editorRef}
          // TODO(burdon): Is this correct?
          focus={true}
          model={model}
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
          slots={{ editor: { placeholder: 'Enter comment...' } }}
        />
      </div>
    </div>
  );
};

const Sidebar: FC<{
  threads: CommentThread[];
  selected?: string;
  onSelect: (thread: string) => void;
}> = ({ threads, selected, onSelect }) => {
  // Sort by y-position.
  const sortedThreads = useMemo(() => {
    const sorted = [...threads];
    return sorted.sort(({ yPos: a = Infinity }, { yPos: b = Infinity }) => {
      return a < b ? -1 : a > b ? 1 : 0;
    });
  }, [threads]);

  return (
    <div className='flex flex-col grow overflow-y-scroll py-2 gap-4 pr-4'>
      {sortedThreads.map((thread) => (
        <Thread
          key={thread.id}
          thread={thread}
          selected={thread.id === selected}
          onSelect={() => onSelect(thread.id)}
        />
      ))}
    </div>
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
  const [selected, setSelected] = useState<string>();
  const commentRanges = useMemo(() => threads.map((thread) => thread.range), [threads]);

  // TODO(burdon): Get y position.
  const handleCreateComment: CommentsOptions['onCreate'] = (cursor, location) => {
    const id = PublicKey.random().toHex();
    setThreads((threads) => [
      ...threads,
      {
        id,
        range: { id, cursor },
        yPos: location?.top,
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
          thread.yPos = range.location?.top;
        }

        return thread;
      }),
    );

    setSelected(active ?? closest);
  };

  const handleSelectThread = (id: string) => {
    setSelected(id);
  };

  return (
    <div className={mx(fixedInsetFlexLayout)}>
      <div className='flex justify-center h-full gap-8'>
        <div className='flex flex-col h-full overflow-hidden w-[600px]'>
          <Editor
            item={item}
            commentRanges={commentRanges}
            onCreateComment={handleCreateComment}
            onSelectComment={handleSelectComment}
          />
        </div>
        <div className='flex flex-col h-full overflow-hidden w-[300px]'>
          <Sidebar threads={threads} selected={selected} onSelect={handleSelectThread} />
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
    autoCreate: true,
  },
};
