//
// Copyright 2024 DXOS.org
//

import { Microphone, MicrophoneSlash } from '@phosphor-icons/react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import React from 'react';

import { Button } from '@dxos/react-ui';

import { useRoomContext } from './hooks/useRoomContext';

export const MicButton = () => {
  const {
    userMedia: { turnMicOn, turnMicOff, audioEnabled },
  } = useRoomContext();

  return (
    <>
      <Button
        variant={audioEnabled ? 'default' : 'destructive'}
        onClick={() => {
          audioEnabled ? turnMicOff() : turnMicOn();
        }}
      >
        <VisuallyHidden>{audioEnabled ? 'Turn mic off' : 'Turn mic on'}</VisuallyHidden>
        {audioEnabled ? <Microphone /> : <MicrophoneSlash />}
      </Button>
    </>
  );
};
