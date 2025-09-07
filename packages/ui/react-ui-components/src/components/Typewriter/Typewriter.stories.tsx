//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type KeyboardEventHandler, useCallback, useEffect, useState } from 'react';

import { Input, Toolbar } from '@dxos/react-ui';
import { ColumnContainer, withLayout, withTheme } from '@dxos/storybook-utils';
import { trim } from '@dxos/util';

import { MarkdownViewer } from '../MarkdownViewer';

import { Markdown, Typewriter, Cursor as TypewriterCursor } from './Typewriter';

type StoryProps = {
  blocks: string[];
  interval?: number;
  cps?: number;
};

const DefaultStory = ({ blocks, interval = 0, cps }: StoryProps) => {
  const [text, setText] = useState('');
  const [refresh, setRefresh] = useState({});

  useEffect(() => {
    if (!blocks) {
      return;
    }

    let i = 0;
    const t = setInterval(() => {
      if (i >= blocks.length) {
        clearInterval(interval);
      } else {
        setText((text) => text + blocks[i]);
      }
      i++;
    }, interval);

    return () => clearInterval(t);
  }, [blocks, interval, refresh]);

  return (
    <div>
      <Toolbar.Root>
        <Toolbar.Button
          onClick={() => {
            setText('');
            setRefresh({});
          }}
        >
          Restart
        </Toolbar.Button>
      </Toolbar.Root>
      <Typewriter classNames='p-2' text={text} cps={cps} />
    </div>
  );
};

// TODO(burdon): Use codemirror (standard rendering of markdown; virtualization; more stable? faster?)
const Text = ({ text, delay, trail }: { text: string; delay: number; trail: number }) => {
  const [index, setIndex] = useState(0);
  const str = (text + ' '.repeat(trail)).slice(0, index);
  const main = str.slice(0, -trail);
  const last = str.slice(-trail);

  useEffect(() => {
    setIndex(0);
    const i = setInterval(() => {
      setIndex((index) => {
        if (index >= text.length + trail) {
          clearInterval(i);
          return index;
        }
        return index + 3;
      });
    }, delay);
    return () => clearInterval(i);
  }, [text]);

  return (
    <div className='inline-block p-2 font-mono'>
      <Markdown content={main} />
      {/* <Trail text={last} length={trail} /> */}
      {/* <TypewriterCursor blink={index >= text.length + trail} /> */}
    </div>
  );
};

// TODO(burdon): Turn this into a CM extension.
const Trail = ({ text, length = 8 }: { text?: string; length?: number }) => {
  return (
    <span>
      {text?.split('').map((c, i) => (
        <span key={i} style={{ opacity: 1 - i / length }}>
          {c}
        </span>
      ))}
    </span>
  );
};

function splitIntoWordChunks(text: string, wordsPerChunk: number): string[] {
  const words = text.split(/ +/); // Don't remove page breaks.
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += wordsPerChunk) {
    chunks.push(words.slice(i, i + wordsPerChunk).join(' ') + ' ');
  }

  return chunks;
}

const fence = '```';

const longMarkdown = trim`
Markdown is a lightweight markup language used to format plain text in a simple and readable way. It allows you to create structured documents using conventions for headings, lists, emphasis (bold/italic), links, images, code, blockquotes, tables, and horizontal rules. 

It’s widely used in:
- documentation
- note-taking
- online writing

There are task lists also:
- [ ] Not done
- [x] Done

Markdown is designed to be human-readable, meaning that even without rendering, the text remains understandable. It’s highly portable and supported across many platforms like GitHub, documentation tools, blogging systems, and note-taking apps.

${fence}json
{
  "hello": "world", 
  "items": [1, 2, 3, 4, 5]
}
${fence}

And tables:

| Column 1 | Column 2 |
| -------- | -------- |
| Item 1   | Item 2   |
| Item 3   | Item 4   |
| Item 5   | Item 6   |

There are also extended flavors of Markdown (like GitHub Flavored Markdown) that add features such as checkboxes, footnotes, and task lists, expanding its capabilities for more complex documents.
Markdown’s simplicity makes it ideal for writing structured content quickly while keeping the source clean and readable.

If you want, I can also break down how Markdown parsing actually works behind the scenes, which explains how these plain-text symbols get converted to formatted output. Do you want me to do that?
`;

const longText = trim`
There are also extended flavors of Markdown (like GitHub Flavored Markdown) that add features such as checkboxes, footnotes, and task lists, expanding its capabilities for more complex documents.
Markdown’s simplicity makes it ideal for writing structured content quickly while keeping the source clean and readable.

If you want, I can also break down how Markdown parsing actually works behind the scenes, which explains how these plain-text symbols get converted to formatted output. Do you want me to do that?
`;

const meta = {
  title: 'ui/react-ui-components/Typewriter',
  render: DefaultStory,
  decorators: [withTheme, withLayout({ fullscreen: true, Container: ColumnContainer })],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    cps: 200,
    interval: 100,
    blocks: splitIntoWordChunks(longMarkdown, 10),
  },
};

export const Static = () => <MarkdownViewer content={longMarkdown} />;

export const Cursor = () => (
  <div>
    <span>Hello</span>
    <TypewriterCursor blink />
  </div>
);

export const Fade = () => {
  const [text, setText] = useState('');

  const handleKeyDown = useCallback<NonNullable<KeyboardEventHandler<HTMLInputElement>>>((ev) => {
    switch (ev.key) {
      case 'Enter': {
        setText(longMarkdown);
        (ev.currentTarget as HTMLInputElement).value = '';
        break;
      }
      case 'Escape': {
        setText('');
        break;
      }
    }
  }, []);

  return (
    <div className='flex flex-col p-2 gap-2'>
      <Input.Root>
        <Input.TextInput
          autoFocus
          classNames='is-full bg-transparent border-none outline-none'
          placeholder='Type something...'
          onKeyDown={handleKeyDown}
        />
      </Input.Root>
      <Text text={text} delay={10} trail={64} />
    </div>
  );
};
