//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { MediaPlayer } from '@dxos/react-ui';

import { type VariantContent } from '#surfaces';

import { useVariantSource } from '../../hooks';

export type VideoVariantProps = {
  variant: VariantContent;
};

/**
 * Default `VariantRenderer` for `video/*`: the react-ui {@link MediaPlayer} resolved from the
 * variant's url/content. `MediaPlayer` reserves a width-derived `aspect-video` box, so switching
 * variants no longer flashes the element at its intrinsic size before metadata loads. `kind='video'`
 * forces native playback even for extensionless `blob:`/`data:` sources (materialized content).
 */
export const VideoVariant = ({ variant }: VideoVariantProps) => {
  const src = useVariantSource(variant);
  if (!src) {
    return null;
  }

  return (
    <MediaPlayer classNames='dx-container' src={src} kind='video' fit='contain' alt={variant.generation?.prompt} />
  );
};

VideoVariant.displayName = 'VideoVariant';
