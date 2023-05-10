//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { Size } from '@dxos/aurora-types';

import {
  AvatarFallback,
  AvatarImage,
  AvatarLabel,
  AvatarMaskedImage,
  AvatarRoot,
  AvatarStatus,
  useJdenticonHref
} from './Avatar';

type StorybookAvatarProps = {
  imgSrc?: string;
  fallbackValue: string;
  label: string;
  status?: 'active' | 'inactive';
  variant?: 'circle' | 'square';
  size?: Size;
};

const StorybookAvatar = ({
  status = 'active',
  size = 12,
  variant = 'circle',
  label,
  fallbackValue,
  imgSrc
}: StorybookAvatarProps) => {
  const jdenticon = useJdenticonHref(fallbackValue ?? '', size);
  return (
    <AvatarRoot {...{ size, variant }}>
      <AvatarLabel>{label}</AvatarLabel>
      <AvatarStatus status={status}>
        <AvatarImage asChild>
          <AvatarMaskedImage href={imgSrc} />
        </AvatarImage>
        <AvatarFallback asChild>
          <AvatarMaskedImage href={jdenticon} />
        </AvatarFallback>
      </AvatarStatus>
    </AvatarRoot>
  );
};

export default {
  component: StorybookAvatar
};

export const Default = {
  args: {
    fallbackValue: '20970b563fc49b5bb194a6ffdff376031a3a11f9481360c071c3fed87874106b',
    label: 'Display name',
    status: 'active',
    variant: 'circle',
    size: 12
  }
};
