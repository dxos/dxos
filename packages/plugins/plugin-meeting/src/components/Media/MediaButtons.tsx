//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useCapability } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { ButtonGroup, IconButton, useTranslation } from '@dxos/react-ui';

import { MeetingCapabilities } from '../../capabilities';
import { MEETING_PLUGIN } from '../../meta';

export const MediaButtons = () => {
  const { t } = useTranslation(MEETING_PLUGIN);
  const call = useCapability(MeetingCapabilities.CallManager);
  return (
    <ButtonGroup>
      <IconButton
        icon={call.media.audioEnabled ? 'ph--microphone--regular' : 'ph--microphone-slash--regular'}
        label={call.media.audioEnabled ? t('mic off') : t('mic on')}
        onClick={
          call.media.audioEnabled
            ? () => call.turnAudioOff().catch((err) => log.catch(err))
            : () => call.turnAudioOn().catch((err) => log.catch(err))
        }
        iconOnly
      />
      <IconButton
        icon={call.media.videoEnabled ? 'ph--video-camera--regular' : 'ph--video-camera-slash--regular'}
        label={call.media.videoEnabled ? t('camera off') : t('camera on')}
        onClick={
          call.media.videoEnabled
            ? () => call.turnVideoOff().catch((err) => log.catch(err))
            : () => call.turnVideoOn().catch((err) => log.catch(err))
        }
        iconOnly
      />
    </ButtonGroup>
  );
};
