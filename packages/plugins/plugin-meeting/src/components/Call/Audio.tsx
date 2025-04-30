//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren, type FC } from 'react';

import { useCapability } from '@dxos/app-framework';
import { type ThemedClassName } from '@dxos/react-ui';

import { MeetingCapabilities } from '../../capabilities';
import { AudioStream } from '../Media';

export const CallAudio: FC<PropsWithChildren<ThemedClassName>> = () => {
  const call = useCapability(MeetingCapabilities.CallManager);

  return <AudioStream tracks={call.pulledAudioTracks} />;
};
