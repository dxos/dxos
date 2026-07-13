//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type VariantContent } from '#surfaces';

import { useVariantSource } from '../../hooks';

export type ImageVariantProps = {
  variant: VariantContent;
};

/** Default `VariantRenderer` for `image/*`: an `<img>` resolved from the variant's url/content. */
export const ImageVariant = ({ variant }: ImageVariantProps) => {
  const src = useVariantSource(variant);
  if (!src) {
    return null;
  }
  return <img src={src} alt={variant.generation?.prompt ?? ''} className='block max-is-full bs-auto mli-auto rounded' />;
};

ImageVariant.displayName = 'ImageVariant';
