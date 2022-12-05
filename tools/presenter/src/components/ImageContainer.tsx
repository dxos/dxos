//
// Copyright 2022 DXOS.org
//

import React from 'react';

export type ImageContainerProps = {
  backgroundImage?: string;
  backgroundSize?: 'cover' | 'contain';
  backgroundPosition?: string;
  fullBleed?: boolean;
} & React.HTMLProps<HTMLDivElement>;

/**
 * Background image container.
 */
export const ImageContainer = ({
  backgroundImage,
  backgroundSize = 'cover',
  backgroundPosition = 'center center',
  fullBleed = true,
  ...props
}: ImageContainerProps) => {
  // TODO(burdon): From theme.
  const margin = fullBleed ? -64 : 0;

  return (
    <div
      className='flex flex-1'
      style={{
        margin,
        backgroundImage,
        backgroundRepeat: 'no-repeat',
        backgroundPosition,
        backgroundSize,
        ...props
      }}
    />
  );
};
