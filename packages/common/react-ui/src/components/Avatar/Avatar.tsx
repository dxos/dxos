//
// Copyright 2022 DXOS.org
//

import * as AvatarPrimitive from '@radix-ui/react-avatar';
import cx from 'classnames';
import { toSvg } from 'jdenticon';
import React, {
  cloneElement,
  ComponentProps,
  ForwardedRef,
  forwardRef,
  PropsWithChildren,
  ReactHTMLElement,
  ReactNode,
  useMemo
} from 'react';

import { useId } from '../../hooks';
import { Size } from '../../props';
import { getSize } from '../../styles';

export interface AvatarProps extends ComponentProps<typeof AvatarPrimitive.Root> {
  fallbackValue: string;
  label: string | Omit<ReactHTMLElement<HTMLElement>, 'ref'>;
  size?: Size;
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
    { mediaSrc, fallbackValue, label, variant = 'square', size = 10, ...rootProps }: PropsWithChildren<AvatarProps>,
    ref: ForwardedRef<HTMLSpanElement>
  ) => {
    const labelId = useId('avatarLabel');
    const imgSrc = useMemo(
      () => `data:image/svg+xml;utf8,${encodeURIComponent(toSvg(fallbackValue, size === 'px' ? 1 : size * 4))}`,
      [fallbackValue]
    );
    return (
      <>
        <AvatarPrimitive.Root
          {...rootProps}
          className={cx('relative inline-flex', getSize(size), rootProps.className)}
          aria-labelledby={labelId}
          ref={ref}
        >
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
        {typeof label === 'string' ? (
          <span id={labelId} className='sr-only'>
            {label}
          </span>
        ) : (
          cloneElement(label, { id: labelId })
        )}
      </>
    );
  }
);
