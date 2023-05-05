//
// Copyright 2022 DXOS.org
//

import { Circle, Moon } from '@phosphor-icons/react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import * as PortalPrimitive from '@radix-ui/react-portal';
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

import { useId, Size } from '@dxos/aurora';
import { getSize, mx } from '@dxos/aurora-theme';

export interface AvatarSlots {
  root?: Omit<ComponentProps<typeof AvatarPrimitive.Root>, 'children'>;
  image?: ComponentProps<'image'>;
  fallback?: Omit<ComponentProps<typeof AvatarPrimitive.Fallback>, 'children'>;
  labels?: Omit<ComponentProps<'div'>, 'children'>;
}

interface SharedAvatarProps {
  fallbackValue: string;
  label?: string | Omit<ReactHTMLElement<HTMLElement>, 'ref'>;
  description?: string | Omit<ReactHTMLElement<HTMLElement>, 'ref'>;
  labelId?: string;
  descriptionId?: string;
  size?: Size;
  variant?: 'square' | 'circle';
  status?: 'active' | 'inactive';
  mediaSrc?: string;
  mediaAlt?: string;
  children?: ReactNode;
  slots?: AvatarSlots;
}

interface DirectlyLabeledAvatarProps extends Omit<SharedAvatarProps, 'label'> {
  label: string | Omit<ReactHTMLElement<HTMLElement>, 'ref'>;
}

interface IdLabeledAvatarProps extends Omit<SharedAvatarProps, 'labelId'> {
  labelId: string;
}

export type AvatarProps = DirectlyLabeledAvatarProps | IdLabeledAvatarProps;

export const Avatar = forwardRef(
  (
    {
      mediaSrc,
      mediaAlt,
      fallbackValue,
      label,
      labelId: propsLabelId,
      descriptionId: propsDescriptionId,
      description,
      variant = 'square',
      status,
      size = 10,
      slots = {}
    }: PropsWithChildren<AvatarProps>,
    ref: ForwardedRef<HTMLSpanElement>
  ) => {
    const labelId = useId('avatarLabel', propsLabelId);
    const descriptionId = useId('avatarDescription', propsDescriptionId);
    const maskId = useId('mask');
    const svgId = useId('mask');
    const fallbackSrc = useMemo(
      () =>
        `data:image/svg+xml;utf8,${encodeURIComponent(
          toSvg(fallbackValue, size === 'px' ? 1 : size * 4, { padding: 0 })
        )}`,
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
          {...((description || propsDescriptionId) && { 'aria-describedby': descriptionId })}
          ref={ref}
        >
          <svg
            viewBox={`0 0 ${imageSizeNumber} ${imageSizeNumber}`}
            width={imageSizeNumber}
            height={imageSizeNumber}
            id={svgId}
            className='is-full bs-full'
          >
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
                <image href={mediaSrc} width='100%' height='100%' {...slots.image} mask={`url(#${maskId})`} />
              </AvatarPrimitive.Image>
            )}
            <AvatarPrimitive.Fallback delayMs={0} {...slots.fallback} asChild>
              <image href={fallbackSrc} width='100%' height='100%' mask={`url(#${maskId})`} />
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
        <div role='none' {...slots.labels} className={mx('contents', slots?.labels?.className)}>
          {!propsLabelId &&
            label &&
            (typeof label === 'string' ? (
              <PortalPrimitive.Root asChild>
                <span id={labelId} className='sr-only'>
                  {label}
                </span>
              </PortalPrimitive.Root>
            ) : (
              cloneElement(label, { id: labelId })
            ))}
          {!propsDescriptionId &&
            description &&
            (typeof description === 'string' ? (
              <span id={descriptionId}>{description}</span>
            ) : (
              cloneElement(description, { id: descriptionId })
            ))}
        </div>
      </>
    );
  }
);
