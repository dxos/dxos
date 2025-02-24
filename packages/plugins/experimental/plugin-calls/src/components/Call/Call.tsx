//
// Copyright 2024 DXOS.org
//

import React, { useState, type FC } from 'react';

import { Toolbar, type ThemedClassName, IconButton, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { nonNullable } from '@dxos/util';

import { PullAudioTracks } from './PullAudioTracks';
import { useCallContext, useBroadcastStatus, useDebugMode, useTranscription } from '../../hooks';
import { CALLS_PLUGIN } from '../../meta';
import { type TranscriptionState } from '../../types';
import { MediaButtons } from '../Media';
import { ParticipantGrid } from '../Participant';

/**
 * Meeting component.
 */
export const Call: FC<ThemedClassName> = ({ classNames }) => {
  const { t } = useTranslation(CALLS_PLUGIN);
  const debugEnabled = useDebugMode();
  const {
    call: { ai, room, user: self, updateUserState },
    userMedia,
    peer,
    isSpeaking,
    pushedTracks,
    setJoined,
    onTranscription,
  } = useCallContext();

  // Broadcast status over swarm.
  const [raisedHand, setRaisedHand] = useState(false);
  useBroadcastStatus({
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
    audioStreamTrack: userMedia.audioTrack,
    isSpeaking,
  });
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

  // Filter out self.
  const otherUsers = (room.users ?? []).filter((user) => user.id !== self.id);

  // Screen sharing.
  const canSharescreen =
    typeof navigator.mediaDevices !== 'undefined' && navigator.mediaDevices.getDisplayMedia !== undefined;
  const isScreensharing = userMedia.screenshareVideoTrack !== undefined;

  return (
    <PullAudioTracks audioTracks={otherUsers.map((user) => user.tracks?.audio).filter(nonNullable)}>
      <div className={mx('flex flex-col w-full h-full overflow-hidden', classNames)}>
        <ParticipantGrid user={self} users={otherUsers} debug={debugEnabled} />

        <Toolbar.Root>
          <IconButton
            variant='destructive'
            icon='ph--phone-x--regular'
            label={t('leave call')}
            onClick={() => {
              userMedia.turnScreenshareOff();
              setJoined(false);
            }}
          />
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
      </div>
    </PullAudioTracks>
  );
};

Call.displayName = 'Call';
