//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import { Toolbar } from '@dxos/react-ui';
import { ColumnContainer, withLayout, withTheme } from '@dxos/storybook-utils';

import { TextBlock } from './TextBlock';

export const DefaultStory = ({ blocks, period = 200 }: { blocks: string[]; period?: number }) => {
  const [text, setText] = useState('');
  const [refresh, setRefresh] = useState({});

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i >= blocks.length - 1) {
        clearInterval(interval);
      } else {
        setText((text) => text + ' ' + blocks[i]);
      }
      i++;
    }, period);

    return () => clearInterval(interval);
  }, [blocks, period, refresh]);

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
      <TextBlock classNames='p-2' text={text} />
    </div>
  );
};

const meta: Meta<typeof DefaultStory> = {
  title: 'ui/react-ui-components/TextBlock',
  render: DefaultStory,
  decorators: [withTheme, withLayout({ fullscreen: true, Container: ColumnContainer })],
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    blocks: [
      'Hello! How can I',
      "help you today? I'm ready",
      'to assist you with tasks',
      'related to reading or writing',
      'documents using the available',
      'tools. Is there a specific',
      "document you'd like to work",
      'with or a task you need help with?',
    ],
  },
};
