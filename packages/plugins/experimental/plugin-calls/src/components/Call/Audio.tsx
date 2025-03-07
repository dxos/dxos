//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren, type FC } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';

import { useCallGlobalContext } from '../../hooks';
import { AudioStream } from '../Media';

export const CallAudio: FC<PropsWithChildren<ThemedClassName>> = () => {
  const {
    call: { pulledAudioTracks },
  } = useCallGlobalContext();

  return <AudioStream tracks={pulledAudioTracks} />;
};
