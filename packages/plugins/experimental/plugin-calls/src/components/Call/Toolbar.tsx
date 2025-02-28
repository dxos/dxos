//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import { Toolbar, IconButton, useTranslation } from '@dxos/react-ui';

import { useCallContext, useBroadcastStatus, useTranscription } from '../../hooks';
import { CALLS_PLUGIN } from '../../meta';
import { type TranscriptionState } from '../../types';
import { MediaButtons } from '../Media';

export const CallToolbar = () => {
  const { t } = useTranslation(CALLS_PLUGIN);
  const {
    call: { ai, user: self, updateUserState },
    userMedia,
    peer,
    isSpeaking,
    pushedTracks,
    setJoined,
    onTranscription,
  } = useCallContext();

  // Screen sharing.
  const isScreensharing = userMedia.state.screenshareVideoTrack !== undefined;
  const canSharescreen =
    typeof navigator.mediaDevices !== 'undefined' && navigator.mediaDevices.getDisplayMedia !== undefined;

  // Broadcast status over swarm.
  const [raisedHand, setRaisedHand] = useState(false);
  useBroadcastStatus({
    transcription: ai.transcription,
    peer,
    user: self,
    userMedia,
    pushedTracks,
    raisedHand,
    speaking: isSpeaking,
    onUpdateUserState: updateUserState,
  });

  // Transcription.
  useTranscription({
    transcription: ai.transcription,
    author: self.name || 'Unknown',
    audioStreamTrack: userMedia.state.audioTrack,
    isSpeaking,
  });

  const handleLeave = () => {
    userMedia.turnScreenshareOff();
    setJoined(false);
  };

  const handleToggleTranscription = async () => {
    const transcription: TranscriptionState = {
      enabled: !ai.transcription.enabled,
      lamportTimestamp: ai.transcription.lamportTimestamp! + 1,
    };

    // Check not already running.
    if (!ai.transcription.enabled && !ai.transcription.objectDxn) {
      const object = await onTranscription?.();
      if (object) {
        transcription.objectDxn = object.queue;
      }
    }

    ai.setTranscription(transcription);
  };

  return (
    <Toolbar.Root>
      <IconButton variant='destructive' icon='ph--phone-x--regular' label={t('leave call')} onClick={handleLeave} />
      <div className='grow'></div>
      <IconButton
        icon={ai.transcription.enabled ? 'ph--text-t--regular' : 'ph--text-t-slash--regular'}
        iconOnly
        label={ai.transcription.enabled ? t('transcription off') : t('transcription on')}
        onClick={handleToggleTranscription}
      />
      <IconButton
        disabled={!canSharescreen}
        icon={isScreensharing ? 'ph--broadcast--regular' : 'ph--screencast--regular'}
        iconOnly
        label={isScreensharing ? t('screenshare off') : t('screenshare on')}
        classNames={[isScreensharing && 'text-red-500']}
        onClick={isScreensharing ? userMedia.turnScreenshareOff : userMedia.turnScreenshareOn}
      />
      <IconButton
        icon={raisedHand ? 'ph--hand-waving--regular' : 'ph--hand-palm--regular'}
        iconOnly
        label={raisedHand ? t('lower hand') : t('raise hand')}
        classNames={[raisedHand && 'text-red-500']}
        onClick={() => setRaisedHand((raisedHand) => !raisedHand)}
      />
      <MediaButtons userMedia={userMedia} />
    </Toolbar.Root>
  );
};

CallToolbar.displayName = 'CallToolbar';
