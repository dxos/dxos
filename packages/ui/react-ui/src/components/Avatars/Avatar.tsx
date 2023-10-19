//
// Copyright 2023 DXOS.org
//

import {
  Root as AvatarRootPrimitive,
  type AvatarProps as AvatarRootPrimitiveProps,
  Image as AvatarImagePrimitive,
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
}: AvatarRootProps) => {
  const labelId = useId('avatar__label', propsLabelId);
  const descriptionId = useId('avatar__description', propsDescriptionId);
  const maskId = useId('avatar__mask', propsMaskId);
  return (
    <AvatarProvider {...{ labelId, descriptionId, maskId, size, variant, status, animation, inGroup }}>
      {children}
    </AvatarProvider>
  );
};

type AvatarFrameProps = ThemedClassName<AvatarRootPrimitiveProps>;

const strokeWidth = 2;
const rx = 8;

const AvatarFrame = forwardRef<HTMLSpanElement, AvatarFrameProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    const { size, variant, labelId, descriptionId, maskId, inGroup, status, animation } =
      useAvatarContext('AvatarFrame');

    const { tx } = useThemeContext();
    const imageSizeNumber = size === 'px' ? 1 : size * 4;
    const ringGap = 3;
    const ringWidth = 2;
    const r = imageSizeNumber / 2 - ringGap - ringWidth;
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
                <circle fill='white' cx='50%' cy='50%' r={r} />
              ) : (
                <rect fill='white' width={2 * r} height={2 * r} x={ringGap + ringWidth} y={ringGap + ringWidth} />
              )}
            </mask>
          </defs>
          {variant === 'circle' ? (
            <g>
              <circle fill='#999' stroke='none' opacity={0.1} cx='50%' cy='50%' r={r} />
              <circle stroke='#888' fill='none' opacity={0.3} cx='50%' cy='50%' r={r} />
            </g>
          ) : (
            <g>
              <rect
                fill='#999'
                stroke='none'
                opacity={0.1}
                width={2 * r}
                height={2 * r}
                x={ringGap + ringWidth}
                y={ringGap + ringWidth}
                rx={2}
              />
              <rect
                fill='none'
                stroke='#333'
                opacity={0.15}
                width={2 * r}
                height={2 * r}
                x={ringGap + ringWidth}
                y={ringGap + ringWidth}
                rx={2}
              />
            </g>
            //   <circle
            //     className='avatarFrameFill fill-[var(--surface-bg)]'
            //     cx={imageSizeNumber / 2}
            //     cy={imageSizeNumber / 2}
            //     r={imageSizeNumber / 2}
            //   />
            // ) : (
            //   <rect
            //     className='avatarFrameFill fill-[var(--surface-bg)]'
            //     width={imageSizeNumber}
            //     height={imageSizeNumber}
            //     rx={rx}
            //   />
          )}
          {children}
          {variant === 'circle' ? (
            <circle
              className='avatarFrameStroke fill-transparent stroke-[var(--surface-bg)]'
              strokeWidth={strokeWidth}
              cx={imageSizeNumber / 2}
              cy={imageSizeNumber / 2}
              r={imageSizeNumber / 2 - strokeWidth / 4}
            />
          ) : (
            <rect
              className='avatarFrameStroke fill-transparent stroke-[var(--surface-bg)]'
              strokeWidth={strokeWidth}
              x={strokeWidth / 4}
              y={strokeWidth / 4}
              rx={rx}
              width={imageSizeNumber - strokeWidth / 4}
              height={imageSizeNumber - strokeWidth / 4}
            />
          )}
        </svg>
        <span className={tx('avatar.ring', 'avatar__ring', { size, variant, status, animation })}></span>
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
    return (
      <AvatarImagePrimitive onLoadingStatusChange={onLoadingStatusChange} asChild>
        <AvatarMaskedImage {...props} ref={forwardedRef} />
      </AvatarImagePrimitive>
    );
  },
);

type AvatarFallbackProps = ComponentPropsWithRef<'image'> & {
  delayMs?: number;
  text?: string;
};

const AvatarFallback = forwardRef<SVGImageElement, AvatarFallbackProps>(({ delayMs, text, ...props }, forwardedRef) => {
  const isTextOnly = Boolean(text && /[0-9a-zA-Z]+/.test(text));
  return (
    <AvatarFallbackPrimitive delayMs={delayMs} asChild>
      <>
        <AvatarMaskedImage {...props} ref={forwardedRef} />
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
