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
 * url/content. Fills the container with `object-contain` (rather than sizing to the video's
 * intrinsic dimensions) so switching variants does not flash the element at its default small size
 * before metadata loads.
 */
export const VideoVariant = ({ variant }: VideoVariantProps) => {
  const src = useVariantSource(variant);
  if (!src) {
    return null;
  }
  return <video src={src} controls preload='metadata' className='block is-full bs-full object-contain rounded' />;
};

VideoVariant.displayName = 'VideoVariant';
