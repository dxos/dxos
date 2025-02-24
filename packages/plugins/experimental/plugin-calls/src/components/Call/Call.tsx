//
// Copyright 2024 DXOS.org
//

import React, { useState, type FC } from 'react';

import { Toolbar, type ThemedClassName, IconButton, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { nonNullable } from '@dxos/util';

import { PullAudioTracks } from './PullAudioTracks';
import { useCallContext, useBroadcastStatus, useDebugMode, useTranscription, useAi } from '../../hooks';
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
  const [raisedHand, setRaisedHand] = useState(false);
  const ai = useAi();
  const {
    userMedia,
    peer,
    isSpeaking,
    pushedTracks,
    room: { user, otherUsers, updateUserState },
    setJoined,
    onTranscription,
  } = useCallContext();

  // Broadcast status over swarm.
  useBroadcastStatus({
    peer,
    user,
    userMedia,
    pushedTracks,
    raisedHand,
    speaking: isSpeaking,
    onUpdateUserState: updateUserState,
  });

  // Transcription.
  useTranscription({ user, userMedia, isSpeaking });
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

  // Screen sharing.
  const otherUserIsSharing = otherUsers.some((user) => user.tracks?.screenshare);
  const sharing = userMedia.screenshareVideoTrack !== undefined;
  const canShareScreen =
    typeof navigator.mediaDevices !== 'undefined' && navigator.mediaDevices.getDisplayMedia !== undefined;

  // TODO(burdon): Raise hand.
  return (
    <PullAudioTracks audioTracks={otherUsers.map((user) => user.tracks?.audio).filter(nonNullable)}>
      <div className={mx('flex flex-col w-full h-full overflow-hidden', classNames)}>
        <ParticipantGrid user={user} users={otherUsers} debug={debugEnabled} />

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
            disabled={!canShareScreen || otherUserIsSharing}
            icon={sharing ? 'ph--screencast--regular' : 'ph--rectangle--regular'}
            iconOnly
            label={sharing ? t('screenshare off') : t('screenshare on')}
            onClick={sharing ? userMedia.turnScreenshareOff : userMedia.turnScreenshareOn}
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
