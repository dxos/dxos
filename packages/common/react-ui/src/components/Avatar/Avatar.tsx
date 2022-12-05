//
// Copyright 2022 DXOS.org
//

import * as AvatarPrimitive from '@radix-ui/react-avatar';
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
import { mx } from '../../util';

export interface AvatarSlots {
  root?: Omit<ComponentProps<typeof AvatarPrimitive.Root>, 'children'>;
  image?: Omit<ComponentProps<typeof AvatarPrimitive.Image>, 'children'>;
  fallback?: Omit<ComponentProps<typeof AvatarPrimitive.Fallback>, 'children'>;
}

export interface AvatarProps {
  fallbackValue: string;
  label: string | Omit<ReactHTMLElement<HTMLElement>, 'ref'>;
  size?: Size;
  variant?: 'square' | 'circle';
  mediaSrc?: string;
  mediaAlt?: string;
  children?: ReactNode;
  slots?: AvatarSlots;
}

const shapeStyles = {
  circle: 'rounded-full',
  square: 'rounded'
};

export const Avatar = forwardRef(
  (
    {
      mediaSrc,
      mediaAlt,
      fallbackValue,
      label,
      variant = 'square',
      size = 10,
      slots = {}
    }: PropsWithChildren<AvatarProps>,
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
          {...slots.root}
          className={mx('relative inline-flex', getSize(size), slots.root?.className)}
          aria-labelledby={labelId}
          ref={ref}
        >
          {mediaSrc && (
            <AvatarPrimitive.Image
              {...slots.image}
              src={mediaSrc}
              alt={mediaAlt ?? 'Avatar'}
              className={mx('h-full w-full object-cover overflow-hidden', shapeStyles[variant], slots.image?.className)}
            />
          )}
          <AvatarPrimitive.Fallback
            delayMs={0}
            {...slots.fallback}
            className={mx(
              'shrink-0 flex h-full w-full items-center justify-center bg-white dark:bg-neutral-800 overflow-hidden',
              shapeStyles[variant],
              slots.fallback?.className
            )}
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
