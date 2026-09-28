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

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

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
  };

/** An `<img>` in a fixed-ratio frame that shows the well while loading and a broken-image icon on error. */
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
      onLoad,
      onError,
      ...props
    },
    forwardedRef,
  ) => {
    // Keyed by source so a new `src` starts loading again without an effect racing the load event.
    const source = `${src ?? ''} ${srcSet ?? ''}`;
    const [result, setResult] = useState<{ source: string; status: ImageStatus }>();
    const status: ImageStatus = result?.source === source ? result.status : 'loading';
    const aspectStyle: CSSProperties & CSSVariables = { '--nx-image-aspect': aspectRatio };
    return (
      <div
        {...props}
        data-scope='image'
        data-part='root'
        data-fit={fit}
        data-status={status}
        style={{ ...aspectStyle, ...style }}
        className={mx(recipes.image(), classNames)}
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
              setResult({ source, status: 'loaded' });
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

Image.displayName = 'Next.Image';
