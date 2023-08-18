//
// Copyright 2023 DXOS.org
//

import { Circle, Moon } from '@phosphor-icons/react';
import {
  Root as AvatarRootPrimitive,
  AvatarProps as AvatarRootPrimitiveProps,
  Image as AvatarImagePrimitive,
  ImageLoadingStatus,
  Fallback as AvatarFallbackPrimitive,
} from '@radix-ui/react-avatar';
import { createContext } from '@radix-ui/react-context';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import { toSvg } from 'jdenticon';
import React, { ComponentPropsWithRef, forwardRef, PropsWithChildren, useMemo } from 'react';

import { Size } from '@dxos/aurora-types';
import { useId } from '@dxos/react-hooks';

import { useThemeContext } from '../../hooks';
import { ThemedClassName } from '../../util';

type AvatarVariant = 'square' | 'circle';
type AvatarStatus = 'active' | 'inactive';

type AvatarRootProps = PropsWithChildren<Partial<AvatarContextValue>>;

type AvatarContextValue = {
  labelId: string;
  descriptionId: string;
  maskId: string;
  size: Size;
  variant: AvatarVariant;
  status?: AvatarStatus;
  inGroup?: boolean;
};
const AVATAR_NAME = 'Avatar';
const [AvatarProvider, useAvatarContext] = createContext<AvatarContextValue>(AVATAR_NAME);

const AvatarRoot = ({
  size = 10,
  variant = 'circle',
  status,
  children,
  labelId: propsLabelId,
  descriptionId: propsDescriptionId,
  maskId: propsMaskId,
  inGroup,
}: AvatarRootProps) => {
  const labelId = useId('avatar__label', propsLabelId);
  const descriptionId = useId('avatar__description', propsDescriptionId);
  const maskId = useId('avatar__mask', propsMaskId);
  return (
    <AvatarProvider {...{ labelId, descriptionId, maskId, size, variant, status, inGroup }}>{children}</AvatarProvider>
  );
};

type AvatarFrameProps = ThemedClassName<AvatarRootPrimitiveProps>;

const AvatarFrame = forwardRef<HTMLSpanElement, AvatarFrameProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    const { size, variant, labelId, descriptionId, maskId, inGroup, status } = useAvatarContext('AvatarFrame');
    const { tx } = useThemeContext();
    const imageSizeNumber = size === 'px' ? 1 : size * 4;
    const statusIconSize = (size as number) > 9 ? 4 : (size as number) < 6 ? 2 : 3;
    const maskSize = statusIconSize * 4 + 2;
    const maskCenter = imageSizeNumber - (statusIconSize * 4) / 2;
    return (
      <AvatarRootPrimitive
        role='img'
        {...props}
        className={tx('avatar.root', 'avatar', { size, variant, inGroup }, classNames)}
        ref={forwardedRef}
        {...(!inGroup && {
          'aria-labelledby': labelId,
          'aria-describedby': descriptionId,
        })}
      >
        <svg
          viewBox={`0 0 ${imageSizeNumber} ${imageSizeNumber}`}
          width={imageSizeNumber}
          height={imageSizeNumber}
          className={tx('avatar.frame', 'avatar__frame', {})}
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
          {variant === 'circle' ? (
            <circle className='avatarFrameFill fill-[var(--surface-bg)]' cx='50%' cy='50%' r='50%' />
          ) : (
            <rect className='avatarFrameFill fill-[var(--surface-bg)]' width='100%' height='100%' />
          )}
          {children}
          {variant === 'circle' ? (
            <circle
              className='avatarFrameStroke fill-transparent stroke-[var(--surface-bg)] stroke-2'
              cx='50%'
              cy='50%'
              r='50%'
            />
          ) : (
            <rect
              className='avatarFrameStroke fill-transparent stroke-[var(--surface-bg)] stroke-2'
              width='100%'
              height='100%'
            />
          )}
        </svg>
        {status === 'inactive' ? (
          <Moon
            mirrored
            weight='fill'
            className={tx('avatar.statusIcon', 'avatar__status-icon', { size: statusIconSize, status })}
          />
        ) : status ? (
          <Circle
            weight='fill'
            className={tx('avatar.statusIcon', 'avatar__status-icon', { size: statusIconSize, status })}
          />
        ) : null}
      </AvatarRootPrimitive>
    );
  },
);

type AvatarLabelProps = ThemedClassName<Omit<ComponentPropsWithRef<typeof Primitive.span>, 'id'>> & {
  asChild?: boolean;
  srOnly?: boolean;
};

const AvatarLabel = forwardRef<HTMLSpanElement, AvatarLabelProps>(
  ({ asChild, srOnly, classNames, ...props }, forwardedRef) => {
    const Root = asChild ? Slot : Primitive.span;
    const { tx } = useThemeContext();
    const { labelId } = useAvatarContext('AvatarLabel');
    return (
      <Root
        {...props}
        id={labelId}
        ref={forwardedRef}
        className={tx('avatar.label', 'avatar__label', { srOnly }, classNames)}
      />
    );
  },
);

type AvatarDescriptionProps = ThemedClassName<Omit<ComponentPropsWithRef<typeof Primitive.span>, 'id'>> & {
  asChild?: boolean;
  srOnly?: boolean;
};

const AvatarDescription = forwardRef<HTMLSpanElement, AvatarDescriptionProps>(
  ({ asChild, srOnly, classNames, ...props }, forwardedRef) => {
    const Root = asChild ? Slot : Primitive.span;
    const { tx } = useThemeContext();
    const { descriptionId } = useAvatarContext('AvatarDescription');
    return (
      <Root
        {...props}
        id={descriptionId}
        ref={forwardedRef}
        className={tx('avatar.description', 'avatar__description', { srOnly }, classNames)}
      />
    );
  },
);

type AvatarMaskedImageProps = ComponentPropsWithRef<'image'>;

const AvatarMaskedImage = forwardRef<SVGImageElement, AvatarMaskedImageProps>((props, forwardedRef) => {
  const { maskId } = useAvatarContext('AvatarFallback');
  return <image width='100%' height='100%' {...props} mask={`url(#${maskId})`} ref={forwardedRef} />;
});

type AvatarImageProps = ComponentPropsWithRef<'image'> & {
  onLoadingStatusChange?: (status: ImageLoadingStatus) => void;
};

const AvatarImage = forwardRef<SVGImageElement, AvatarImageProps>(
  ({ onLoadingStatusChange, ...props }, forwardedRef) => {
    return (
      <AvatarImagePrimitive onLoadingStatusChange={onLoadingStatusChange} asChild>
        <AvatarMaskedImage {...props} ref={forwardedRef} />
      </AvatarImagePrimitive>
    );
  },
);

type AvatarFallbackProps = ComponentPropsWithRef<'image'> & {
  delayMs?: number;
};

const AvatarFallback = forwardRef<SVGImageElement, AvatarFallbackProps>(({ delayMs, ...props }, forwardedRef) => {
  return (
    <AvatarFallbackPrimitive delayMs={delayMs} asChild>
      <AvatarMaskedImage {...props} ref={forwardedRef} />
    </AvatarFallbackPrimitive>
  );
});

const getJdenticonHref = (value: string, size: Size) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(toSvg(value, size === 'px' ? 1 : size * 4, { padding: 0 }))}`;

const useJdenticonHref = (value: string, size: Size) => {
  return useMemo(() => getJdenticonHref(value, size), [value]);
};

export const Avatar = {
  Root: AvatarRoot,
  Frame: AvatarFrame,
  Image: AvatarImage,
  Fallback: AvatarFallback,
  Label: AvatarLabel,
  Description: AvatarDescription,
};

export { useJdenticonHref, useAvatarContext, getJdenticonHref };

export type {
  AvatarStatus,
  AvatarVariant,
  AvatarRootProps,
  AvatarFrameProps,
  AvatarImageProps,
  AvatarFallbackProps,
  AvatarLabelProps,
  AvatarDescriptionProps,
};
