//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { MediaPlayer } from '@dxos/react-ui';

import { type VariantContent } from '#surfaces';

import { useVariantSource } from '../../hooks';

export type ImageVariantProps = {
  variant: VariantContent;
};

/** Default `VariantRenderer` for `image/*`: the react-ui {@link MediaPlayer} (an `<img>` for image
 * URLs) resolved from the variant's url/content, contained within the pane. */
export const ImageVariant = ({ variant }: ImageVariantProps) => {
  const src = useVariantSource(variant);
  if (!src) {
    return null;
  }

  return <MediaPlayer classNames='dx-container' src={src} fit='contain' alt={variant.generation?.prompt} />;
};

ImageVariant.displayName = 'ImageVariant';
