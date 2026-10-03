//
// Copyright 2026 DXOS.org
//

import { Avatar as AvatarPrimitive } from '@ark-ui/react/avatar';
import React, { type CSSProperties, forwardRef, useState } from 'react';

import { sampleDominantColor } from '@dxos/lit-ui';
import { mx } from '@dxos/ui-theme';
import { type ChromaticPalette, type NeutralPalette, type ThemedClassName, hues } from '@dxos/ui-types';

import { recipes } from '../../recipes.ts';
import { type Size } from '../../sizes.ts';
import { type CSSVariables } from '../Container/index.ts';
import { Icon } from '../Icon/index.ts';

export type AvatarVariant = 'circle' | 'square';

export type AvatarStatus = 'active' | 'inactive' | 'current' | 'internal' | 'error' | 'warning';

export type AvatarAnimation = 'pulse' | 'none';

export type AvatarHue = NeutralPalette | ChromaticPalette;

/** A stored hue name (e.g. from a profile) as an `AvatarHue`; `undefined` when it names no palette. */
export const toAvatarHue = (value?: string): AvatarHue | undefined =>
  value === 'neutral' ? 'neutral' : hues.find((hue) => hue === value);

/** `fill` paints the hue's solid background, `surface` its tint (Tag's colours), `transparent` none. */
export type AvatarHueVariant = 'fill' | 'surface' | 'transparent';

const getInitials = (label: string): string[] =>
  label
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase());

/** Up to two initials of a name; an emoji or symbol with no letters is shown as given. */
/** A fallback that is a pictograph rather than a name, drawn larger than initials. */
const EMOJI = /^\p{Extended_Pictographic}/u;

export const getAvatarGlyph = (fallback = ''): string => {
  const initials = getInitials(fallback);
  return initials.length > 0 ? initials.join('') : fallback;
};

//
// Root
//

type AvatarRootProps = ThemedClassName<Omit<AvatarPrimitive.RootProps, 'children'>> & {
  /** Diameter is the block at this size; inherited from the enclosing scope when omitted. */
  size?: Size;
  /** Fills its host's inline size (a square), for portraits larger than a block. */
  fill?: boolean;
  variant?: AvatarVariant;
  /** Draws a ring in the status colour. */
  status?: AvatarStatus;
  animation?: AvatarAnimation;
  hue?: AvatarHue;
  hueVariant?: AvatarHueVariant;
  /** Image source; the fallback shows until it loads, and again if it fails. */
  src?: string;
  /** Fills behind the image with its dominant edge colour once it loads (a photo with transparent or uneven edges). */
  backdrop?: 'dominant';
  /** A name (shown as initials) or an emoji. */
  fallback?: string;
  /** Shown in place of the fallback text. */
  icon?: string;
  /** Names the avatar (`aria-label`); otherwise reference a visible name with `aria-labelledby`. */
  label?: string;
  /** Replace the default Image and Fallback. */
  children?: AvatarPrimitive.RootProps['children'];
};

/**
 * Ark's avatar: an image over a fallback of initials, an emoji or an icon, in a circle or square one block across
 * (or its host's width with `fill`). The root is the element (`role=img`), so a label, ring and hue all land on it.
 */
const AvatarRoot = forwardRef<HTMLDivElement, AvatarRootProps>(
  (
    {
      classNames,
      size,
      fill,
      variant = 'circle',
      status,
      animation = 'none',
      hue,
      hueVariant = 'fill',
      src,
      backdrop,
      fallback = '🫥',
      icon,
      label,
      children,
      style,
      ...props
    },
    forwardedRef,
  ) => {
    // Keyed by source, so a new `src` drops the previous image's colour without an effect racing the load event.
    const [sampled, setSampled] = useState<{ src: string; color?: string }>();
    const color = sampled && sampled.src === src ? sampled.color : undefined;
    const backdropStyle: CSSProperties & CSSVariables = color ? { '--dx-avatar-backdrop': color } : {};
    return (
      <AvatarPrimitive.Root
        role='img'
        {...(label && { 'aria-label': label })}
        {...props}
        data-size={size}
        data-fill={fill ? '' : undefined}
        data-variant={variant}
        data-status={status}
        data-animation={animation === 'none' ? undefined : animation}
        data-hue={hue}
        data-hue-variant={hueVariant}
        data-backdrop={backdrop}
        style={{ ...backdropStyle, ...style }}
        className={mx(recipes.avatar(), classNames)}
        ref={forwardedRef}
      >
        {children ?? (
          <>
            {src && (
              <AvatarImage
                src={src}
                onLoad={
                  backdrop === 'dominant'
                    ? (event) => setSampled({ src, color: sampleDominantColor(event.currentTarget) })
                    : undefined
                }
              />
            )}
            <AvatarFallback data-emoji={!icon && EMOJI.test(fallback) ? '' : undefined}>
              {icon ? <Icon icon={icon} /> : getAvatarGlyph(fallback)}
            </AvatarFallback>
          </>
        )}
      </AvatarPrimitive.Root>
    );
  },
);

AvatarRoot.displayName = 'Avatar.Root';

//
// Image
//

type AvatarImageProps = ThemedClassName<AvatarPrimitive.ImageProps>;

const AvatarImage = forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ classNames, alt = '', ...props }, forwardedRef) => (
    <AvatarPrimitive.Image {...props} alt={alt} className={mx(recipes.avatarImage(), classNames)} ref={forwardedRef} />
  ),
);

AvatarImage.displayName = 'Avatar.Image';

//
// Fallback
//

type AvatarFallbackProps = ThemedClassName<AvatarPrimitive.FallbackProps>;

/** Shown until the image loads; its text scales with the avatar (container query units). */
const AvatarFallback = forwardRef<HTMLSpanElement, AvatarFallbackProps>(({ classNames, ...props }, forwardedRef) => (
  <AvatarPrimitive.Fallback
    aria-hidden
    {...props}
    className={mx(recipes.avatarFallback(), classNames)}
    ref={forwardedRef}
  />
));

AvatarFallback.displayName = 'Avatar.Fallback';

export const Avatar = {
  Root: AvatarRoot,
  Image: AvatarImage,
  Fallback: AvatarFallback,
};

export type { AvatarFallbackProps, AvatarImageProps, AvatarRootProps };
