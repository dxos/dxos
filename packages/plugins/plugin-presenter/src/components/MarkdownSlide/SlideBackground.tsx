//
// Copyright 2026 DXOS.org
//

import React, { type CSSProperties } from 'react';

import { type LayoutName, type SlideFrontmatter, isSafeUrl } from '#markdown';

// A function-call color (`rgb(...)`, `oklch(...)`, ...), a hex color, or a bare keyword such as `teal`.
const COLOR = /^(#[0-9a-f]{3,8}|(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\([^;{}]*\)|[a-z]+)$/i;
const DATA_VIDEO = /^data:video\//i;

// A declaration terminator or block brace would let a value escape its property in server-rendered CSS.
const UNSAFE_CSS = /[;{}]/;

/** A CSS position value, or undefined when it could escape its declaration. */
const safePosition = (position: string | undefined): string | undefined =>
  position === undefined || UNSAFE_CSS.test(position) ? undefined : position;

/** True when a `background` value is a CSS color rather than an image URL. */
export const isColor = (value: string): boolean => COLOR.test(value.trim());

// Frontmatter is not covered by the markdown URL sanitizer, so media URLs are checked here.
const safeImageUrl = (url: string | undefined): string | undefined =>
  url !== undefined && url.trim().length > 0 && isSafeUrl(url, true) ? url.trim() : undefined;

const safeVideoUrl = (url: string | undefined): string | undefined =>
  url !== undefined && url.trim().length > 0 && (isSafeUrl(url, false) || DATA_VIDEO.test(url.trim()))
    ? url.trim()
    : undefined;

/** CSS that paints an image URL as a cover background, or `{}` when the URL is unsafe. */
export const imageStyle = (url: string | undefined, position?: string): CSSProperties => {
  const safe = safeImageUrl(url);
  if (safe === undefined) {
    return {};
  }
  return {
    // JSON string quoting escapes `"` and `\`, so the URL cannot end the CSS string early.
    backgroundImage: `url(${JSON.stringify(safe)})`,
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: safePosition(position) ?? 'center',
  };
};

/**
 * Style for the frontmatter `background`: a CSS color (hex, color function, or keyword) or otherwise an image URL.
 */
export const backgroundStyle = ({
  background,
  backgroundPosition,
}: Pick<SlideFrontmatter, 'background' | 'backgroundPosition'>): CSSProperties => {
  if (background === undefined || background.trim().length === 0) {
    return {};
  }
  if (isColor(background)) {
    return { backgroundColor: background.trim() };
  }
  return imageStyle(background, backgroundPosition);
};

export type SlideBackgroundProps = {
  frontmatter: SlideFrontmatter;
  layout?: LayoutName;
};

/**
 * Full-slide backdrop: `background` color/image (`image` for the `image` layout) and a muted looping
 * `backgroundVideo`, faded by `backgroundOpacity`.
 */
export const SlideBackground = ({ frontmatter, layout }: SlideBackgroundProps) => {
  // The `image` layout is a full-bleed picture, so its `image` takes the place of `background`.
  const style =
    layout === 'image' && frontmatter.image !== undefined
      ? imageStyle(frontmatter.image, frontmatter.backgroundPosition)
      : backgroundStyle(frontmatter);
  const video = safeVideoUrl(frontmatter.backgroundVideo);
  if (Object.keys(style).length === 0 && video === undefined) {
    return null;
  }

  return (
    <div
      aria-hidden
      data-slide-background
      className='dx-cover pointer-events-none'
      style={{ opacity: frontmatter.backgroundOpacity }}
    >
      {Object.keys(style).length > 0 && <div className='dx-cover' style={style} />}
      {video && (
        <video
          className='dx-cover size-full object-cover'
          style={{ objectPosition: safePosition(frontmatter.backgroundPosition) }}
          src={video}
          autoPlay
          muted
          loop
          playsInline
        />
      )}
    </div>
  );
};
