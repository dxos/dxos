//
// Copyright 2024 DXOS.org
//

import { VideoCamera, VideoCameraSlash } from '@phosphor-icons/react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import React from 'react';

import { Button } from '@dxos/react-ui';

import { useRoomContext } from './hooks/useRoomContext';

export const CameraButton = () => {
  const {
    userMedia: { turnCameraOff, turnCameraOn, videoEnabled },
  } = useRoomContext();

  return (
    <Button
      variant={videoEnabled ? 'default' : 'destructive'}
      onClick={() => {
        videoEnabled ? turnCameraOff() : turnCameraOn();
      }}
    >
      <VisuallyHidden>{videoEnabled ? 'Turn camera off' : 'Turn camera on'}</VisuallyHidden>
      {videoEnabled ? <VideoCamera /> : <VideoCameraSlash />}
    </Button>
  );
};
