//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Avatar, useJdenticonHref } from './Avatar';
import { AvatarGroup, AvatarGroupItem } from './AvatarGroup';

const items = [
  '[&_.avatarFrameFill]:fill-lime-500',
  '[&_.avatarFrameFill]:fill-teal-500',
  '[&_.avatarFrameFill]:fill-purple-500',
  '[&_.avatarFrameFill]:fill-pink-500',
];

const StorybookAvatarGroupItem = ({ n }: { n: number }) => {
  const href = useJdenticonHref(`StorybookAvatarGroupItem--${n}`, 4);
  return (
    <AvatarGroupItem.Root>
      <Avatar.Frame classNames={items[n]}>
        <Avatar.Fallback href={href} />
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
  component: StorybookAvatarGroup,
};

export const Default = {
  args: {},
};
