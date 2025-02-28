//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import { useTranscription } from '@dxos/plugin-transcription';
import { Toolbar, IconButton, useTranslation } from '@dxos/react-ui';

import { useCallContext, useBroadcastStatus } from '../../hooks';
import { CALLS_PLUGIN } from '../../meta';
import { MediaButtons } from '../Media';

export const CallToolbar = () => {
  const { t } = useTranslation(CALLS_PLUGIN);
  const {
    call: { user: self, transcription, updateUserState },
    userMedia,
    peer,
    isSpeaking,
    pushedTracks,
    setJoined,
    onTranscription,
  } = useCallContext();

  // Screen sharing.
  const isScreensharing = userMedia.screenshareVideoTrack !== undefined;
  const canSharescreen =
    typeof navigator.mediaDevices !== 'undefined' && navigator.mediaDevices.getDisplayMedia !== undefined;

  // Broadcast status over swarm.
  const [raisedHand, setRaisedHand] = useState(false);
  useBroadcastStatus({
    peer,
    user: self,
    userMedia,
    pushedTracks,
    raisedHand,
    speaking: isSpeaking,
    transcription: transcription.state.value,
    onUpdateUserState: updateUserState,
  });

  // Transcription.
  useTranscription({
    author: self.name,
    isSpeaking,
    audioStreamTrack: userMedia.audioTrack,
    transcription: transcription.state.value,
  });

  const handleLeave = () => {
    userMedia.turnScreenshareOff();
    setJoined(false);
  };

  const handleToggleTranscription = async () => {
    transcription.setEnabled(!transcription.state.value.enabled);
    if (transcription.state.value.enabled && !transcription.state.value.objectDxn) {
      const object = await onTranscription?.();
      if (object?.queue) {
        transcription.setQueue(object.queue);
      }
    }
  };

  return (
    <Toolbar.Root>
      <IconButton variant='destructive' icon='ph--phone-x--regular' label={t('leave call')} onClick={handleLeave} />
      <div className='grow'></div>
      {/* TODO(burdon): Capability test. */}
      <IconButton
        iconOnly
        icon={transcription.state.value.enabled ? 'ph--text-t--regular' : 'ph--text-t-slash--regular'}
        label={transcription.state.value.enabled ? t('transcription off') : t('transcription on')}
        onClick={handleToggleTranscription}
      />
      <IconButton
        disabled={!canSharescreen}
        iconOnly
        icon={isScreensharing ? 'ph--broadcast--regular' : 'ph--screencast--regular'}
        label={isScreensharing ? t('screenshare off') : t('screenshare on')}
        classNames={[isScreensharing && 'text-red-500']}
        onClick={isScreensharing ? userMedia.turnScreenshareOff : userMedia.turnScreenshareOn}
      />
      <IconButton
        iconOnly
        icon={raisedHand ? 'ph--hand-waving--regular' : 'ph--hand-palm--regular'}
        label={raisedHand ? t('lower hand') : t('raise hand')}
        classNames={[raisedHand && 'text-red-500']}
        onClick={() => setRaisedHand((raisedHand) => !raisedHand)}
      />
      <MediaButtons userMedia={userMedia} />
    </Toolbar.Root>
  );
};

CallToolbar.displayName = 'CallToolbar';
