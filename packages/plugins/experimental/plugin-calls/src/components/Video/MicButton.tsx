//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Button, Icon } from '@dxos/react-ui';

import { useRoomContext } from '../../hooks';

export const MicButton = () => {
  const {
    userMedia: { turnMicOn, turnMicOff, audioEnabled },
  } = useRoomContext();

  return (
    <Button
      variant={audioEnabled ? 'default' : undefined}
      onClick={() => {
        audioEnabled ? turnMicOff() : turnMicOn();
      }}
    >
      <Icon icon={audioEnabled ? 'ph--microphone--regular' : 'ph--microphone-slash--regular'} />
    </Button>
  );
};
