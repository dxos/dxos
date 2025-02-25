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
        icon={userMedia.audioEnabled ? 'ph--microphone--regular' : 'ph--microphone-slash--regular'}
        label={userMedia.audioEnabled ? t('mic off') : t('mic on')}
        onClick={userMedia.audioEnabled ? userMedia.turnMicOff : userMedia.turnMicOn}
        iconOnly
      />
      <IconButton
        icon={userMedia.videoEnabled ? 'ph--video-camera--regular' : 'ph--video-camera-slash--regular'}
        label={userMedia.videoEnabled ? t('camera off') : t('camera on')}
        onClick={userMedia.videoEnabled ? userMedia.turnCameraOff : userMedia.turnCameraOn}
        iconOnly
      />
    </>
  );
};
