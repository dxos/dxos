//
// Copyright 2023 DXOS.org
//
import { Circle, Moon } from '@phosphor-icons/react';
import {
  Root as AvatarRootPrimitive,
  AvatarProps as AvatarRootPrimitiveProps,
  Image as AvatarImagePrimitive,
  AvatarImageProps as AvatarImagePrimitiveProps,
  Fallback as AvatarFallbackPrimitive,
  AvatarFallbackProps as AvatarFallbackPrimitiveProps
} from '@radix-ui/react-avatar';
import { createContext } from '@radix-ui/react-context';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import { toSvg } from 'jdenticon';
import React, { ComponentPropsWithRef, forwardRef, useMemo } from 'react';

import { Size } from '@dxos/aurora-types';
import { useId } from '@dxos/react-hooks';

import { useThemeContext } from '../../hooks';

type AvatarVariant = 'square' | 'circle';

type AvatarRootProps = AvatarRootPrimitiveProps & { size?: Size; variant?: AvatarVariant };

type AvatarContextValue = { labelId: string; maskId: string; size: Size; variant: AvatarVariant };
const AVATAR_NAME = 'Avatar';
const [AvatarProvider, useAvatarContext] = createContext<AvatarContextValue>(AVATAR_NAME);

const AvatarRoot = forwardRef<HTMLSpanElement, AvatarRootProps>(
  ({ size = 10, variant = 'circle', className, id: propsId, ...props }, forwardedRef) => {
    const labelId = useId('avatar__label', propsId);
    const maskId = useId('mask');
    const { tx } = useThemeContext();
    return (
      <AvatarProvider {...{ labelId, maskId, size, variant }}>
        <AvatarRootPrimitive
          {...props}
          className={tx('avatar.root', 'avatar', { size, variant }, className)}
          ref={forwardedRef}
        />
      </AvatarProvider>
    );
  }
);

type AvatarLabelProps = Omit<ComponentPropsWithRef<typeof Primitive.span>, 'id'> & {
  asChild?: boolean;
  srOnly?: boolean;
};

const AvatarLabel = forwardRef<HTMLSpanElement, AvatarLabelProps>(
  ({ asChild, srOnly, className, ...props }, forwardedRef) => {
    const Root = asChild ? Slot : Primitive.span;
    const { tx } = useThemeContext();
    const { labelId } = useAvatarContext('AvatarLabel');
    return (
      <Root
        {...props}
        id={labelId}
        ref={forwardedRef}
        className={tx('avatar.label', 'avatar__label', { srOnly }, className)}
      />
    );
  }
);

type AvatarImageProps = AvatarImagePrimitiveProps;

const AvatarImage = forwardRef<HTMLImageElement, AvatarImageProps>((props, forwardedRef) => {
  const { labelId } = useAvatarContext('AvatarImage');
  return <AvatarImagePrimitive role='img' {...props} aria-labelledby={labelId} ref={forwardedRef} />;
});

type AvatarFallbackProps = AvatarFallbackPrimitiveProps;

const AvatarFallback = forwardRef<HTMLSpanElement, AvatarFallbackProps>((props, forwardedRef) => {
  const { labelId } = useAvatarContext('AvatarFallback');
  return <AvatarFallbackPrimitive role='img' {...props} aria-labelledby={labelId} ref={forwardedRef} />;
});

type AvatarStatusProps = ComponentPropsWithRef<'svg'> & { status?: 'active' | 'inactive' };

const AvatarStatus = forwardRef<SVGSVGElement, AvatarStatusProps>(
  ({ children, className, status, ...props }, forwardedRef) => {
    const { labelId, maskId, size, variant } = useAvatarContext('AvatarStatus');
    const { tx } = useThemeContext();
    const imageSizeNumber = size === 'px' ? 1 : size * 4;
    const statusIconSize = size > 9 ? 4 : size < 6 ? 2 : 3;
    const maskSize = statusIconSize * 4 + 2;
    const maskCenter = imageSizeNumber - (statusIconSize * 4) / 2;
    return (
      <>
        <svg
          role='img'
          {...props}
          viewBox={`0 0 ${imageSizeNumber} ${imageSizeNumber}`}
          width={imageSizeNumber}
          height={imageSizeNumber}
          aria-labelledby={labelId}
          className={tx('avatar.status', 'avatar__status', {}, className)}
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
          {children}
        </svg>
        {status === 'inactive' ? (
          <Moon
            mirrored
            weight='fill'
            className={tx('avatar.statusIcon', 'avatar__status__icon', { size: statusIconSize, status })}
          />
        ) : (
          <Circle
            weight='fill'
            className={tx('avatar.statusIcon', 'avatar__status__icon', { size: statusIconSize, status })}
          />
        )}
      </>
    );
  }
);

type AvatarMaskedImageProps = ComponentPropsWithRef<'image'>;

const AvatarMaskedImage = forwardRef<SVGImageElement, AvatarMaskedImageProps>((props, forwardedRef) => {
  const { maskId } = useAvatarContext('AvatarFallback');
  return <image width='100%' height='100%' {...props} mask={`url(#${maskId})`} ref={forwardedRef} />;
});

const useJdenticonHref = (value: string, size: Size) => {
  return useMemo(
    () => `data:image/svg+xml;utf8,${encodeURIComponent(toSvg(value, size === 'px' ? 1 : size * 4, { padding: 0 }))}`,
    [value]
  );
};

export {
  AvatarRoot,
  AvatarImage,
  AvatarFallback,
  AvatarLabel,
  AvatarStatus,
  AvatarMaskedImage,
  useJdenticonHref,
  useAvatarContext
};

export type {
  AvatarRootProps,
  AvatarImageProps,
  AvatarFallbackProps,
  AvatarLabelProps,
  AvatarStatusProps,
  AvatarMaskedImageProps
};
