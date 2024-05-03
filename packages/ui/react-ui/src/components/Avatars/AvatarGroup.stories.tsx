//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { toEmoji } from '@dxos/util';

import { Avatar } from './Avatar';
import { AvatarGroup, AvatarGroupItem } from './AvatarGroup';
import { withTheme } from '../../testing';

const items = [
  '[&_.avatarFrameFill]:fill-lime-500',
  '[&_.avatarFrameFill]:fill-teal-500',
  '[&_.avatarFrameFill]:fill-purple-500',
  '[&_.avatarFrameFill]:fill-pink-500',
];

const StorybookAvatarGroupItem = ({ n }: { n: number }) => {
  const emoji = toEmoji(n);
  return (
    <AvatarGroupItem.Root>
      <Avatar.Frame classNames={items[n]}>
        <Avatar.Fallback text={emoji} />
      </Avatar.Frame>
    </AvatarGroupItem.Root>
  );
};

const StorybookAvatarGroup = () => {
  return (
    <AvatarGroup.Root size={8} variant='circle'>
      {[0, 1, 2, 3].map((n) => (
        <StorybookAvatarGroupItem key={n} n={n} />
      ))}
      <AvatarGroup.Label srOnly>
        <span>23</span>
      </AvatarGroup.Label>
    </AvatarGroup.Root>
  );
};

export default {
  title: 'react-ui/Avatar Group',
  component: StorybookAvatarGroup,
  decorators: [withTheme],
  parameters: { chromatic: { disableSnapshot: false } },
};

export const Default = {
  args: {},
};
