//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useObject } from '@dxos/echo-react';
import * as StudioHooks from '@dxos/plugin-studio/StudioHooks';
import type * as Variant from '@dxos/plugin-studio/Variant';
import * as Media from '@dxos/react-ui/Media';

export type TakePlayerProps = {
  take: Variant.Variant;
  onEnded?: () => void;
};

/** Plays a take at once, inline: a video take as video, an audio take as an audio bar. */
export const TakePlayer = ({ take, onEnded }: TakePlayerProps) => {
  const [loaded] = useObject(take);
  const src = StudioHooks.useVariantSource({ url: loaded.url, content: loaded.content });
  if (!src) {
    return null;
  }
  const video = loaded.contentType?.startsWith('video/') ?? false;
  return (
    <Media.Player
      classNames={video ? 'w-full' : 'h-10 w-full'}
      src={src}
      kind={video ? 'video' : 'audio'}
      fit='contain'
      autoPlay
      onEnded={onEnded}
      data-testid='recorder.take.player'
    />
  );
};
