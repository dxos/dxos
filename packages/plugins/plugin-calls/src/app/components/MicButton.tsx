//
// Copyright 2024 DXOS.org
//

import { Microphone, MicrophoneSlash } from '@phosphor-icons/react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import React, { type FC } from 'react';
import { useKey } from 'react-use';

import { Button, type ButtonProps } from '@dxos/react-ui';

import { useRoomContext } from '../hooks/useRoomContext';

export const MicButton: FC<ButtonProps> = ({ onClick, ...rest }) => {
  const {
    userMedia: { turnMicOn, turnMicOff, audioEnabled },
  } = useRoomContext();

  const toggle = () => {
    audioEnabled ? turnMicOff() : turnMicOn();
  };

  useKey((e) => {
    if (e.key === 'd' && e.metaKey) {
      e.preventDefault();
      return true;
    }
    return false;
  }, toggle);

  return (
    <>
      <Button
        variant={audioEnabled ? 'default' : 'destructive'}
        onClick={(e) => {
          toggle();
          onClick && onClick(e);
        }}
        {...rest}
      >
        <VisuallyHidden>{audioEnabled ? 'Turn mic off' : 'Turn mic on'}</VisuallyHidden>
        {audioEnabled ? <Microphone /> : <MicrophoneSlash />}
      </Button>
    </>
  );
};
