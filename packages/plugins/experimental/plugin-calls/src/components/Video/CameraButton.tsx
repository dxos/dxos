//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Button, Icon } from '@dxos/react-ui';

import { useRoomContext } from '../../hooks';

export const CameraButton = () => {
  const {
    userMedia: { turnCameraOff, turnCameraOn, videoEnabled },
  } = useRoomContext();

  return (
    <Button
      variant={videoEnabled ? 'default' : undefined}
      onClick={() => {
        videoEnabled ? turnCameraOff() : turnCameraOn();
      }}
    >
      <Icon icon={videoEnabled ? 'ph--video-camera--regular' : 'ph--video-camera-slash--regular'} />
    </Button>
  );
};
