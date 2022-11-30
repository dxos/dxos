//
// Copyright 2022 DXOS.org
//

// File copied from @dxos/react-ui to not depend on @dxos/react-ui because it is not fully finished yet.

import * as AvatarPrimitive from '@radix-ui/react-avatar';
import cx from 'classnames';
import { toSvg } from 'jdenticon';
import React, { ComponentProps, ForwardedRef, forwardRef, PropsWithChildren, ReactNode, useMemo } from 'react';

export interface AvatarProps extends ComponentProps<typeof AvatarPrimitive.Root> {
  fallbackValue: string;
  size?: number;
  variant?: 'square' | 'circle';
  mediaSrc?: string;
  children?: ReactNode;
}

const shapeStyles = {
  circle: 'rounded-full',
  square: 'rounded'
};

export const Avatar = forwardRef(
  (
    { mediaSrc, fallbackValue, variant = 'square', size = 10, ...rootProps }: PropsWithChildren<AvatarProps>,
    ref: ForwardedRef<HTMLSpanElement>
  ) => {
    const imgSrc = useMemo(
      () => `data:image/svg+xml;utf8,${encodeURIComponent(toSvg(fallbackValue, size * 4))}`,
      [fallbackValue]
    );
    return (
      <>
        <AvatarPrimitive.Root {...rootProps} className={cx('relative inline-flex', rootProps.className)} ref={ref}>
          {mediaSrc && (
            <AvatarPrimitive.Image
              src={mediaSrc}
              alt='Avatar'
              className={cx('h-full w-full object-cover overflow-hidden', shapeStyles[variant])}
            />
          )}
          <AvatarPrimitive.Fallback
            className={cx(
              'shrink-0 flex h-full w-full items-center justify-center bg-white dark:bg-neutral-800 overflow-hidden',
              shapeStyles[variant]
            )}
            delayMs={0}
          >
            <img role='none' alt={fallbackValue} src={imgSrc} className='h-full w-full' />
          </AvatarPrimitive.Fallback>
        </AvatarPrimitive.Root>
      </>
    );
  }
);
