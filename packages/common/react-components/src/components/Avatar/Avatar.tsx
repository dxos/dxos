//
// Copyright 2022 DXOS.org
//

import * as AvatarPrimitive from '@radix-ui/react-avatar';
import * as PortalPrimitive from '@radix-ui/react-portal';
import { toSvg } from 'jdenticon';
import { Circle, Moon } from 'phosphor-react';
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
  image?: Omit<ComponentProps<'image'>, 'children'>;
  fallback?: Omit<ComponentProps<typeof AvatarPrimitive.Fallback>, 'children'>;
}

export interface AvatarProps {
  fallbackValue: string;
  label: string | Omit<ReactHTMLElement<HTMLElement>, 'ref'>;
  size?: Size;
  variant?: 'square' | 'circle';
  status?: 'active' | 'inactive';
  mediaSrc?: string;
  mediaAlt?: string;
  children?: ReactNode;
  slots?: AvatarSlots;
}

export const Avatar = forwardRef(
  (
    {
      mediaSrc,
      mediaAlt,
      fallbackValue,
      label,
      variant = 'square',
      status,
      size = 10,
      slots = {}
    }: PropsWithChildren<AvatarProps>,
    ref: ForwardedRef<HTMLSpanElement>
  ) => {
    const labelId = useId('avatarLabel');
    const maskId = useId('mask');
    const svgId = useId('mask');
    const fallbackSrc = useMemo(
      () => `data:image/svg+xml;utf8,${encodeURIComponent(toSvg(fallbackValue, size === 'px' ? 1 : size * 4))}`,
      [fallbackValue]
    );

    const imageSizeNumber = size === 'px' ? 1 : size * 4;
    const statusIconSize = size > 9 ? 4 : size < 6 ? 2 : 3;
    const maskSize = statusIconSize * 4 + 2;
    const maskCenter = imageSizeNumber - (statusIconSize * 4) / 2;

    return (
      <>
        <AvatarPrimitive.Root
          {...slots.root}
          className={mx('relative inline-flex', getSize(size), slots.root?.className)}
          aria-labelledby={labelId}
          ref={ref}
        >
          <svg width={imageSizeNumber} height={imageSizeNumber} id={svgId}>
            <defs>
              <mask id={maskId}>
                {variant === 'circle' ? (
                  <circle fill='white' cx='50%' cy='50%' r='50%' />
                ) : (
                  <rect fill='white' width='100%' height='100%' />
                )}
                {status && (
                  <circle
                    fill='black'
                    cx={`${(100 * maskCenter) / imageSizeNumber}%`}
                    cy={`${(100 * maskCenter) / imageSizeNumber}%`}
                    r={`${(50 * maskSize) / imageSizeNumber}%`}
                  />
                )}
              </mask>
            </defs>
            {mediaSrc && (
              <AvatarPrimitive.Image asChild>
                <image href={mediaSrc} {...slots.image} mask={`url(#${maskId})`} />
              </AvatarPrimitive.Image>
            )}
            <AvatarPrimitive.Fallback delayMs={0} {...slots.fallback} asChild>
              <image href={fallbackSrc} mask={`url(#${maskId})`} />
            </AvatarPrimitive.Fallback>
          </svg>
          {status === 'active' && (
            <Circle
              className={mx(
                getSize(statusIconSize),
                'absolute block-end-0 inline-end-0 text-success-500 dark:text-success-400'
              )}
              weight='fill'
            />
          )}
          {status === 'inactive' && (
            <Moon
              mirrored
              className={mx(
                getSize(statusIconSize),
                'absolute block-end-0 inline-end-0 text-warning-500 dark:text-warning-400'
              )}
              weight='fill'
            />
          )}
        </AvatarPrimitive.Root>
        {typeof label === 'string' ? (
          <PortalPrimitive.Root asChild>
            <span id={labelId} className='sr-only'>
              {label}
            </span>
          </PortalPrimitive.Root>
        ) : (
          cloneElement(label, { id: labelId })
        )}
      </>
    );
  }
);
