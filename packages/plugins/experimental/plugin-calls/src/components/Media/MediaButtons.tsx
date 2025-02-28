//
// Copyright 2025 DXOS.org
//

import React, { type FC } from 'react';

import { IconButton, useTranslation } from '@dxos/react-ui';

import { type UserMedia } from '../../hooks';
import { CALLS_PLUGIN } from '../../meta';

export const MediaButtons: FC<{ userMedia: UserMedia }> = ({ userMedia }) => {
  const { t } = useTranslation(CALLS_PLUGIN);
  return (
    <>
      <IconButton
        icon={userMedia.state.audioEnabled ? 'ph--microphone--regular' : 'ph--microphone-slash--regular'}
        label={userMedia.state.audioEnabled ? t('mic off') : t('mic on')}
        onClick={userMedia.state.audioEnabled ? userMedia.turnMicOff : userMedia.turnMicOn}
        iconOnly
      />
      <IconButton
        icon={userMedia.state.videoEnabled ? 'ph--video-camera--regular' : 'ph--video-camera-slash--regular'}
        label={userMedia.state.videoEnabled ? t('camera off') : t('camera on')}
        onClick={userMedia.state.videoEnabled ? userMedia.turnCameraOff : userMedia.turnCameraOn}
        iconOnly
      />
    </>
  );
};
