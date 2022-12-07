//
// Copyright 2022 DXOS.org
//

import clsx from 'clsx';
import React, { HTMLProps } from 'react';

export type ImageContainerProps = {
  backgroundImage?: string;
  backgroundSize?: 'cover' | 'contain';
  backgroundPosition?: string;
  fullBleed?: boolean;
} & HTMLProps<HTMLDivElement>;

/**
 * Background image container.
 */
export const Image = ({
  backgroundImage,
  backgroundSize = 'cover',
  backgroundPosition = 'center center',
  fullBleed = true,
  ...props
}: ImageContainerProps) => {
  return (
    <div
      className={clsx('flex', 'flex-1', fullBleed && '-m-2')}
      style={{
        backgroundImage,
        backgroundRepeat: 'no-repeat',
        backgroundPosition,
        backgroundSize,
        ...props
      }}
    />
  );
};
