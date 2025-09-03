//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import { Toolbar } from '@dxos/react-ui';
import { ColumnContainer, withLayout, withTheme } from '@dxos/storybook-utils';
import { trim } from '@dxos/util';

import { Typewriter } from './Typewriter';

const DefaultStory = ({ blocks, interval = 0 }: { blocks: string[]; interval?: number }) => {
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
      <Typewriter classNames='p-2' text={text} />
    </div>
  );
};

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

function splitIntoWordChunks(text: string, wordsPerChunk: number): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += wordsPerChunk) {
    chunks.push(words.slice(i, i + wordsPerChunk).join(' ') + ' ');
  }

  return chunks;
}

export const Default: Story = {
  args: {
    blocks: splitIntoWordChunks(
      trim`
        Markdown is a lightweight markup language used to format plain text in a simple and readable way. It allows you to create structured documents using conventions for headings, lists, emphasis (bold/italic), links, images, code, blockquotes, tables, and horizontal rules. The goal is to make the text readable in its raw form while also enabling easy conversion to HTML or other formatted outputs. It’s widely used in documentation, note-taking, and online writing.
        Markdown is designed to be human-readable, meaning that even without rendering, the text remains understandable. It’s highly portable and supported across many platforms like GitHub, documentation tools, blogging systems, and note-taking apps.
        There are also extended flavors of Markdown (like GitHub Flavored Markdown) that add features such as checkboxes, footnotes, and task lists, expanding its capabilities for more complex documents.
        Markdown’s simplicity makes it ideal for writing structured content quickly while keeping the source clean and readable.
        If you want, I can also break down how Markdown parsing actually works behind the scenes, which explains how these plain-text symbols get converted to formatted output. Do you want me to do that?
      `,
      5,
    ),
  },
};
