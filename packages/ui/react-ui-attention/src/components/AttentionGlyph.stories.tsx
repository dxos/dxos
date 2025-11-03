//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect, useState } from 'react';

import { Button } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
import { range } from '@dxos/util';

import { AttentionGlyph, type AttentionGlyphProps } from './AttentionGlyph';

const DefaultStory = (props: AttentionGlyphProps) => (
  <ul className='flex gap-2 mbe-2'>
    <li>
      <AttentionGlyph presence='none' {...props} />
    </li>
    <li>
      <AttentionGlyph presence='one' {...props} />
    </li>
    <li>
      <AttentionGlyph presence='many' {...props} />
    </li>
  </ul>
);

const meta = {
  title: 'ui/react-ui-attention/AttentionGlyph',
  component: AttentionGlyph as any,
  render: DefaultStory,
  decorators: [withTheme],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const Attention: Story = {
  args: { attended: true },
};

export const Contains: Story = {
  args: { containsAttended: true },
};

export const Syncing: Story = {
  render: () => {
    const [spaces, setSpaces] = useState(
      new Map<string, boolean>(range(8).map((i) => [`space-${i + 1}`, Math.random() > 0.5])),
    );
    const [attended, setAttended] = useState(0);

    const handleChangeAttended = useCallback(() => {
      setAttended((attended) => (attended + 1) % 3);
    }, []);

    useEffect(() => {
      const t = setInterval(
        () => {
          setSpaces((spaces) => {
            const space = Array.from(spaces.keys())[Math.floor(Math.random() * spaces.size)];
            spaces.set(space, !spaces.get(space));
            return new Map(spaces);
          });
        },
        2_000 + Math.random() * 3_000,
      );
      return () => clearInterval(t);
    });

    return (
      <div className='flex flex-col p-2 w-[200px]'>
        <Button onClick={handleChangeAttended}>Change attended</Button>
        {Array.from(spaces.entries()).map(([space, sync]) => (
          <div key={space} className='flex items-center'>
            <div className='grow'>{space}</div>
            {sync && <AttentionGlyph syncing attended={attended === 1} containsAttended={attended === 2} />}
          </div>
        ))}
      </div>
    );
  },
};
