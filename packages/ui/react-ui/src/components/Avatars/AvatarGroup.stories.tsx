//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { useId } from '@dxos/react-hooks';
import { toEmoji } from '@dxos/util';


import { Avatar } from './Avatar';

const hues = ['lime', 'teal', 'purple', 'pink'];

const AvatarItem = ({ n }: { n: number }) => {
  const emoji = toEmoji(n);
  return (
    <Avatar.Root>
      <Avatar.Content fallback={emoji} hue={hues[n]} size={8} variant='circle' />
    </Avatar.Root>
  );
};

const DefaultStory = () => {
  const labelId = useId('sb-avatar-group');
  return (
    <div className='dx-avatar-group' aria-labelledby={labelId}>
      {[0, 1, 2, 3].map((n) => (
        <AvatarItem key={n} n={n} />
      ))}
      <span className='sr-only' id={labelId}>
        23
      </span>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-core/AvatarGroup',
  render: DefaultStory,
    parameters: { chromatic: { disableSnapshot: false } },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
