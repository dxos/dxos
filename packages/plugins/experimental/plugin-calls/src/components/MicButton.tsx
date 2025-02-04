//
// Copyright 2024 DXOS.org
//

import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import React from 'react';

import { Button, Icon } from '@dxos/react-ui';

import { useRoomContext } from './hooks';

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
      <VisuallyHidden>{audioEnabled ? 'Turn mic off' : 'Turn mic on'}</VisuallyHidden>
      <Icon icon={audioEnabled ? 'ph--microphone--regular' : 'ph--microphone-slash--regular'} />
    </Button>
  );
};
