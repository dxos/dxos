//
// Copyright 2023 DXOS.org
//

import {
  Root as AvatarRootPrimitive,
  type AvatarProps as AvatarRootPrimitiveProps,
  type ImageLoadingStatus,
  Fallback as AvatarFallbackPrimitive,
} from '@radix-ui/react-avatar';
import { createContext } from '@radix-ui/react-context';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import { toSvg } from 'jdenticon';
import React, { type ComponentPropsWithRef, forwardRef, type PropsWithChildren, useMemo } from 'react';

import { useId } from '@dxos/react-hooks';
import { type Size } from '@dxos/react-ui-types';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';

type AvatarVariant = 'square' | 'circle';
type AvatarStatus = 'active' | 'inactive' | 'error' | 'warning';
type AvatarAnimation = 'pulse' | 'none';

export type AvatarRootProps = PropsWithChildren<Partial<AvatarContextValue>>;

type AvatarContextValue = {
  labelId: string;
  descriptionId: string;
  maskId: string;
  size: Size;
  variant: AvatarVariant;
  status?: AvatarStatus;
  animation?: AvatarAnimation;
  inGroup?: boolean;
  color?: string;
};
const AVATAR_NAME = 'Avatar';
const [AvatarProvider, useAvatarContext] = createContext<AvatarContextValue>(AVATAR_NAME);

const AvatarRoot = ({
  size = 10,
  variant = 'circle',
  status,
  animation,
  children,
  labelId: propsLabelId,
  descriptionId: propsDescriptionId,
  maskId: propsMaskId,
  inGroup,
  color,
}: AvatarRootProps) => {
  const labelId = useId('avatar__label', propsLabelId);
  const descriptionId = useId('avatar__description', propsDescriptionId);
  const maskId = useId('avatar__mask', propsMaskId);
  return (
    <AvatarProvider {...{ labelId, descriptionId, maskId, size, variant, status, animation, inGroup, color }}>
      {children}
    </AvatarProvider>
  );
};

type AvatarFrameProps = ThemedClassName<AvatarRootPrimitiveProps>;

const rx = '0.25rem';

const AvatarFrame = forwardRef<HTMLSpanElement, AvatarFrameProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    const { size, variant, labelId, descriptionId, maskId, inGroup, status, animation, color } =
      useAvatarContext('AvatarFrame');

    const { tx } = useThemeContext();
    const numericSize = size === 'px' ? 1 : Number(size);
    const sizePx = numericSize * 4;
    const ringWidth = numericSize > 4 ? 2 : numericSize > 3 ? 1 : 1;
    const ringGap = numericSize > 12 ? 3 : numericSize > 4 ? 2 : numericSize > 3 ? 1 : 0;
    const r = sizePx / 2 - ringGap - ringWidth;
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
          viewBox={`0 0 ${sizePx} ${sizePx}`}
          width={sizePx}
          height={sizePx}
          className={tx('avatar.frame', 'avatar__frame', { variant })}
        >
          <defs>
            <mask id={maskId}>
              {variant === 'circle' ? (
                <circle fill='white' cx='50%' cy='50%' r={r} />
              ) : (
                <rect
                  fill='white'
                  width={2 * r}
                  height={2 * r}
                  x={ringGap + ringWidth}
                  y={ringGap + ringWidth}
                  rx={rx}
                />
              )}
            </mask>
          </defs>
          {variant === 'circle' ? (
            <circle
              className={`avatarFrameFill${color ? '' : ' fill-[var(--surface-bg)]'}`}
              cx='50%'
              cy='50%'
              r={r}
              {...(color ? { fill: color } : {})}
            />
          ) : (
            <rect
              className='avatarFrameFill fill-[var(--surface-bg)]'
              x={ringGap + ringWidth}
              y={ringGap + ringWidth}
              width={2 * r}
              height={2 * r}
              rx={rx}
            />
          )}
          {children}
          {/* {variant === 'circle' ? (
            <circle
              className='avatarFrameStroke fill-transparent stroke-[var(--surface-text)]'
              strokeWidth={strokeWidth}
              fill='none'
              opacity={0.1}
              cx={'50%'}
              cy={'50%'}
              r={r - 0.5 * strokeWidth}
            />
          ) : (
            <rect
              className='avatarFrameStroke fill-transparent stroke-[var(--surface-text)]'
              strokeWidth={strokeWidth}
              opacity={0.1}
              fill='none'
              x={ringGap + ringWidth}
              y={ringGap + ringWidth}
              width={2 * r}
              height={2 * r}
              rx={rx}
            />
          )} */}
        </svg>
        <span
          role='none'
          className={tx('avatar.ring', 'avatar__ring', { size, variant, status, animation })}
          style={{ borderWidth: ringWidth + 'px' }}
        />
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
  return (
    <image
      width='100%'
      height='100%'
      {...props}
      mask={`url(#${maskId})`}
      ref={forwardedRef}
      preserveAspectRatio='xMidYMid slice'
    />
  );
});

type AvatarMaskedTextProps = PropsWithChildren<{ large?: boolean }>;

const AvatarMaskedText = (props: AvatarMaskedTextProps) => {
  const { maskId, size } = useAvatarContext('AvatarFallback');
  const { large } = props;
  const fontScale = (large ? 4 : 3) * (1 / 1.612);
  const { tx } = useThemeContext();
  return (
    <text
      x='50%'
      y='50%'
      className={tx('avatar.fallbackText', 'avatar__fallback-text')}
      textAnchor='middle'
      alignmentBaseline='central'
      fontSize={size === 'px' ? '200%' : size * fontScale}
      mask={`url(#${maskId})`}
    >
      {props.children}
    </text>
  );
};

type AvatarImageProps = ComponentPropsWithRef<'image'> & {
  onLoadingStatusChange?: (status: ImageLoadingStatus) => void;
};

const AvatarImage = forwardRef<SVGImageElement, AvatarImageProps>(
  ({ onLoadingStatusChange, ...props }, forwardedRef) => {
    const { size } = useAvatarContext('AvatarImage');
    const pxSize = size === 'px' ? 1 : size * 4;
    if (pxSize <= 20) {
      return null;
    }
    return (
      <AvatarFallbackPrimitive asChild>
        <AvatarMaskedImage {...props} ref={forwardedRef} />
      </AvatarFallbackPrimitive>
    );
  },
);

type AvatarFallbackProps = ComponentPropsWithRef<'image'> & {
  delayMs?: number;
  text?: string;
};

const AvatarFallback = forwardRef<SVGImageElement, AvatarFallbackProps>(({ delayMs, text, ...props }, forwardedRef) => {
  const isTextOnly = Boolean(text && /[0-9a-zA-Z]+/.test(text));
  const { size } = useAvatarContext('AvatarFallback');
  const numericSize = size === 'px' ? 1 : Number(size);
  return (
    <AvatarFallbackPrimitive delayMs={delayMs} asChild>
      <>
        {numericSize >= 6 && <AvatarMaskedImage {...props} ref={forwardedRef} />}
        {text && <AvatarMaskedText large={!isTextOnly}>{text.toLocaleUpperCase()}</AvatarMaskedText>}
      </>
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
  AvatarAnimation,
  AvatarFrameProps,
  AvatarImageProps,
  AvatarFallbackProps,
  AvatarLabelProps,
  AvatarDescriptionProps,
};
