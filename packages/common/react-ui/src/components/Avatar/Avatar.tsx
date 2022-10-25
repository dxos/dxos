//
// Copyright 2022 DXOS.org
//

import * as AvatarPrimitive from '@radix-ui/react-avatar';
import cx from 'classnames';
import { toSvg } from 'jdenticon';
import React, {
  cloneElement,
  ComponentProps,
  PropsWithChildren,
  ReactHTMLElement,
  ReactNode,
  useMemo
} from 'react';

import { useId } from '../../hooks';
import { Size } from '../../props/Size';
import { getSize } from '../../styles/size';

export interface AvatarProps
  extends ComponentProps<typeof AvatarPrimitive.Root> {
  fallbackValue: string;
  label: Omit<ReactHTMLElement<HTMLElement>, 'ref'>;
  size?: Size;
  variant?: 'square' | 'circle';
  mediaSrc?: string;
  children?: ReactNode;
}

const shapeStyles = {
  circle: 'rounded-full',
  square: 'rounded'
};

export const Avatar = ({
  mediaSrc,
  fallbackValue,
  label,
  variant = 'square',
  size = 10,
  ...rootProps
}: PropsWithChildren<AvatarProps>) => {
  const labelId = useId('avatarLabel');
  const imgSrc = useMemo(
    () =>
      `data:image/svg+xml;utf8,${encodeURIComponent(
        toSvg(fallbackValue, size === 'px' ? 1 : size * 4)
      )}`,
    [fallbackValue]
  );
  return (
    <>
      <AvatarPrimitive.Root
        {...rootProps}
        className={cx(
          'relative inline-flex',
          getSize(size),
          rootProps.className
        )}
        aria-labelledby={labelId}
      >
        {mediaSrc && (
          <AvatarPrimitive.Image
            src={mediaSrc}
            alt='Avatar'
            className={cx(
              'h-full w-full object-cover overflow-hidden',
              shapeStyles[variant]
            )}
          />
        )}
        <AvatarPrimitive.Fallback
          className={cx(
            'flex h-full w-full items-center justify-center bg-white dark:bg-neutral-800 overflow-hidden',
            shapeStyles[variant]
          )}
          delayMs={0}
        >
          <img
            role='none'
            alt={fallbackValue}
            src={imgSrc}
            className='h-full w-full'
          />
        </AvatarPrimitive.Fallback>
      </AvatarPrimitive.Root>
      {cloneElement(label, { id: labelId })}
    </>
  );
};
