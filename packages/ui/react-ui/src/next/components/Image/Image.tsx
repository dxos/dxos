//
// Copyright 2026 DXOS.org
//

import React, {
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ImgHTMLAttributes,
  forwardRef,
  useState,
} from 'react';

import { sampleDominantColor } from '@dxos/lit-ui';
import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { clickableProps } from '../../clickable.ts';
import { recipes } from '../../recipes.ts';
import { type CSSVariables } from '../Container/index.ts';
import { Icon } from '../Icon/index.ts';

type ImageStatus = 'loading' | 'loaded' | 'error';

type ImageElementProps = Pick<
  ImgHTMLAttributes<HTMLImageElement>,
  'src' | 'srcSet' | 'sizes' | 'crossOrigin' | 'referrerPolicy' | 'loading' | 'decoding' | 'onLoad' | 'onError'
>;

export type ImageProps = ThemedClassName<Omit<ComponentPropsWithoutRef<'div'>, 'children' | 'onLoad' | 'onError'>> &
  ImageElementProps & {
    /** Required: also names the fallback icon when the image fails to load. */
    alt: string;
    /** CSS `aspect-ratio` of the frame. */
    aspectRatio?: string;
    fit?: 'cover' | 'contain';
    /**
     * `dominant` fills the frame behind a loaded image (the letterbox of `contain`) with the colour of its corners;
     * an image whose pixels cannot be read (cross-origin without `crossOrigin` and CORS) leaves the host surface.
     */
    backdrop?: 'dominant';
  };

/**
 * An `<img>` in a fixed-ratio frame that shows the well while loading and a broken-image icon on error. With `onClick`
 * the frame is a button named by `alt`, operable by Enter and Space.
 */
export const Image = forwardRef<HTMLDivElement, ImageProps>(
  (
    {
      classNames,
      style,
      src,
      srcSet,
      sizes,
      crossOrigin,
      referrerPolicy,
      alt,
      loading = 'lazy',
      decoding = 'async',
      aspectRatio = '16 / 9',
      fit = 'cover',
      backdrop,
      onLoad,
      onError,
      onClick,
      onKeyDown,
      ...props
    },
    forwardedRef,
  ) => {
    // Keyed by source so a new `src` starts loading again without an effect racing the load event.
    const source = `${src ?? ''} ${srcSet ?? ''}`;
    const [result, setResult] = useState<{ source: string; status: ImageStatus; color?: string }>();
    const status: ImageStatus = result?.source === source ? result.status : 'loading';
    const color = result?.source === source ? result.color : undefined;
    const aspectStyle: CSSProperties & CSSVariables = {
      '--dx-image-aspect': aspectRatio,
      ...(color ? { '--dx-image-backdrop': color } : {}),
    };
    return (
      <div
        {...props}
        {...clickableProps(onClick, onKeyDown)}
        data-scope='image'
        data-part='root'
        data-fit={fit}
        data-status={status}
        data-backdrop={backdrop}
        style={{ ...aspectStyle, ...style }}
        className={mx(recipes.image(), onClick && recipes.imageClickable(), classNames)}
        ref={forwardedRef}
      >
        {status === 'error' ? (
          <Icon icon='ph--image-broken--regular' label={alt} />
        ) : (
          <img
            src={src}
            srcSet={srcSet}
            sizes={sizes}
            crossOrigin={crossOrigin}
            referrerPolicy={referrerPolicy}
            alt={alt}
            loading={loading}
            decoding={decoding}
            data-scope='image'
            data-part='img'
            onLoad={(event) => {
              const sampled = backdrop === 'dominant' ? sampleDominantColor(event.currentTarget) : undefined;
              setResult({ source, status: 'loaded', color: sampled });
              onLoad?.(event);
            }}
            onError={(event) => {
              setResult({ source, status: 'error' });
              onError?.(event);
            }}
          />
        )}
      </div>
    );
  },
);

Image.displayName = 'Image';
