//
// Copyright 2026 DXOS.org
//

import React from 'react';

import type * as Variant from '@dxos/plugin-studio/Variant';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Media from '@dxos/react-ui/Media';

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

  return (
    <Media.Player
      classNames='h-10 w-full'
      src={src}
      kind='audio'
      autoPlay={autoPlay}
      onEnded={onEnded}
      data-testid='recorder.take.player'
    />
  );
};
