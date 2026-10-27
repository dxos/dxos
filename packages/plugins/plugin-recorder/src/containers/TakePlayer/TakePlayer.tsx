//
// Copyright 2026 DXOS.org
//

import React from 'react';

import type * as Variant from '@dxos/plugin-studio/Variant';
import * as Hooks from '@dxos/react-ui/Hooks';

import { meta } from '#meta';

import { useTakeUrl } from '../../hooks/index.ts';

export type TakePlayerProps = {
  /** The take to play; none shows a hint in its place. */
  take?: Variant.Variant;
  /** Starts playing as soon as the take loads. */
  autoPlay?: boolean;
  onEnded?: () => void;
};

/** The status bar player of a Recordings companion: the current row's take, as an audio bar. */
export const TakePlayer = ({ take, autoPlay, onEnded }: TakePlayerProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const src = useTakeUrl(take);
  if (!take) {
    return <span className='px-2 text-sm text-fg-subtle'>{t('no-current-take.label')}</span>;
  }
  if (!src) {
    return null;
  }

  // A native player rather than Media.Player, which has no `controlsList`: without one the bar has an overflow menu
  // (download, speed) that the status bar does not want.
  return (
    <audio
      // The browser's controls draw a rounded panel of their own, reachable only through its pseudo-elements.
      className='h-10 w-full rounded-none [&::-webkit-media-controls-enclosure]:rounded-none [&::-webkit-media-controls-panel]:rounded-none'
      src={src}
      controls
      controlsList='nodownload noplaybackrate noremoteplayback'
      autoPlay={autoPlay}
      onEnded={onEnded}
      data-testid='recorder.take.player'
    />
  );
};
