//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Media from '@dxos/react-ui/Media';

import { type VariantContent } from '#surfaces';

import { useVariantSource } from '../../hooks/useVariantSource.ts';

export type AudioVariantProps = {
  variant: VariantContent;
};

/**
 * Default `VariantRenderer` for `audio/*`: a native `<audio>` player resolved from the variant's url/content.
 * `kind='audio'` forces native playback for extensionless `blob:`/`data:` sources (materialized content).
 */
export const AudioVariant = ({ variant }: AudioVariantProps) => {
  const src = useVariantSource(variant);
  if (!src) {
    return null;
  }

  return <Media.Player classNames='w-full' src={src} kind='audio' alt={variant.generation?.prompt} />;
};

AudioVariant.displayName = 'AudioVariant';
