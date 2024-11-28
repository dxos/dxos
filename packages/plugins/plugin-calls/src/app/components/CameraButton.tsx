//
// Copyright 2024 DXOS.org
//

import { VideoCamera, VideoCameraSlash } from '@phosphor-icons/react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import React, { type FC } from 'react';
import { useKey } from 'react-use';

import { Button, type ButtonProps } from '@dxos/react-ui';

import { useRoomContext } from '../hooks/useRoomContext';

export const CameraButton: FC<ButtonProps> = ({ onClick, ...rest }) => {
  const {
    userMedia: { turnCameraOff, turnCameraOn, videoEnabled },
  } = useRoomContext();

  const toggle = () => {
    videoEnabled ? turnCameraOff() : turnCameraOn();
  };

  useKey((e) => {
    if (e.key === 'e' && e.metaKey) {
      e.preventDefault();
      return true;
    }
    return false;
  }, toggle);

  return (
    <Button
      variant={videoEnabled ? 'default' : 'destructive'}
      onClick={(e) => {
        toggle();
        onClick && onClick(e);
      }}
      {...rest}
    >
      <VisuallyHidden>{videoEnabled ? 'Turn camera off' : 'Turn camera on'}</VisuallyHidden>
      {videoEnabled ? <VideoCamera /> : <VideoCameraSlash />}
    </Button>
  );
};
