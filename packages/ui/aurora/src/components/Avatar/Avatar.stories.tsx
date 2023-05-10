//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { Size } from '@dxos/aurora-types';

import {
  Avatar,
  AvatarDescription,
  AvatarFallback,
  AvatarImage,
  AvatarLabel,
  AvatarRoot,
  useJdenticonHref
} from './Avatar';

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
  imgSrc
}: StorybookAvatarProps) => {
  const jdenticon = useJdenticonHref(fallbackValue ?? '', size);
  return (
    <AvatarRoot {...{ size, variant, status }}>
      <Avatar>
        <AvatarImage href={imgSrc} />
        <AvatarFallback href={jdenticon} />
      </Avatar>
      <AvatarLabel className='block'>{label}</AvatarLabel>
      <AvatarDescription className='block'>{description}</AvatarDescription>
    </AvatarRoot>
  );
};

export default {
  component: StorybookAvatar
};

export const Default = {
  args: {
    fallbackValue: '20970b563fc49b5bb194a6ffdff376031a3a11f9481360c071c3fed87874106b',
    label: 'Username',
    description: 'Status',
    status: 'active',
    variant: 'circle',
    size: 12
  }
};
