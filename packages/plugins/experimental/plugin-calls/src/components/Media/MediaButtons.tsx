//
// Copyright 2025 DXOS.org
//

import React, { type FC } from 'react';

import { IconButton } from '@dxos/react-ui';

import { type UserMedia } from '../../hooks';

export const MediaButtons: FC<{ userMedia: UserMedia }> = ({ userMedia }) => {
  return (
    <>
      <IconButton
        icon={userMedia.audioEnabled ? 'ph--microphone--regular' : 'ph--microphone-slash--regular'}
        label={userMedia.audioEnabled ? 'Mic' : 'Mic Off'}
        onClick={userMedia.audioEnabled ? userMedia.turnMicOff : userMedia.turnMicOn}
        iconOnly
      />
      <IconButton
        icon={userMedia.videoEnabled ? 'ph--video-camera--regular' : 'ph--video-camera-slash--regular'}
        label={userMedia.videoEnabled ? 'Camera' : 'Camera Off'}
        onClick={userMedia.videoEnabled ? userMedia.turnCameraOff : userMedia.turnCameraOn}
        iconOnly
      />
    </>
  );
};
