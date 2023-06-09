//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { Size } from '@dxos/aurora-types';

import { Avatar, useJdenticonHref } from './Avatar';

type StorybookAvatarProps = {
  imgSrc?: string;
  fallbackValue: string;
  label: string;
  description: string;
  status?: 'active' | 'inactive';
  variant?: 'circle' | 'square';
  size?: Size;
};

const StorybookAvatar = ({
  status = 'active',
  size = 12,
  variant = 'circle',
  label,
  description,
  fallbackValue,
  imgSrc,
}: StorybookAvatarProps) => {
  const jdenticon = useJdenticonHref(fallbackValue ?? '', size);
  return (
    <Avatar.Root {...{ size, variant, status }}>
      <Avatar.Frame>
        <Avatar.Image href={imgSrc} />
        <Avatar.Fallback href={jdenticon} />
      </Avatar.Frame>
      <Avatar.Label classNames='block'>{label}</Avatar.Label>
      <Avatar.Description classNames='block'>{description}</Avatar.Description>
    </Avatar.Root>
  );
};

export default {
  component: StorybookAvatar,
};

export const Default = {
  args: {
    fallbackValue: '20970b563fc49b5bb194a6ffdff376031a3a11f9481360c071c3fed87874106b',
    label: 'Username',
    description: 'Status',
    status: 'active',
    variant: 'circle',
    size: 12,
  },
};
