//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';
import React from 'react';

import { useId } from '@dxos/react-hooks';
import { toEmoji } from '@dxos/util';

import { Avatar } from './Avatar';
import { withTheme } from '../../testing';

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

export default {
  title: 'ui/react-ui-core/AvatarGroup',
  render: DefaultStory,
  decorators: [withTheme],
  parameters: { chromatic: { disableSnapshot: false } },
};

export const Default = {
  args: {},
};
