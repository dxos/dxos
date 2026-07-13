//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type VariantContent } from '#surfaces';

import { useVariantSource } from '../../hooks';

export type VideoVariantProps = {
  variant: VariantContent;
};

/** Default `VariantRenderer` for `video/*`: a `<video controls>` resolved from the variant's url/content. */
export const VideoVariant = ({ variant }: VideoVariantProps) => {
  const src = useVariantSource(variant);
  if (!src) {
    return null;
  }
  return <video src={src} controls className='block max-is-full bs-auto mli-auto rounded' />;
};

VideoVariant.displayName = 'VideoVariant';
