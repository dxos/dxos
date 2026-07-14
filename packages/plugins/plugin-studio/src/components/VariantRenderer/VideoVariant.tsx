//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type VariantContent } from '#surfaces';

import { useVariantSource } from '../../hooks';

export type VideoVariantProps = {
  variant: VariantContent;
};

/**
 * Default `VariantRenderer` for `video/*`: a `<video controls>` resolved from the variant's
 * url/content. Positioned `absolute inset-0` to fill its (positioned) container with
 * `object-contain`, so its box is fixed by the container rather than the video's intrinsic
 * dimensions — switching variants no longer flashes the element at its default small size before
 * metadata loads. The caller must provide a sized, `relative` container.
 */
export const VideoVariant = ({ variant }: VideoVariantProps) => {
  const src = useVariantSource(variant);
  if (!src) {
    return null;
  }
  return <video src={src} controls preload='metadata' className='absolute inset-0 is-full bs-full object-contain' />;
};

VideoVariant.displayName = 'VideoVariant';
