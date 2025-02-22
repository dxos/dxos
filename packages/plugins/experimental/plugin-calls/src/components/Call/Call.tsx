//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';

import { useEdgeClient } from '@dxos/react-edge-client';
import { Toolbar, type ThemedClassName, IconButton } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { nonNullable } from '@dxos/util';

import { PullAudioTracks } from './PullAudioTracks';
import { useRoomContext, useBroadcastStatus, useDebugMode, useTranscription } from '../../hooks';
import { type TranscriptionState } from '../../types';
import { MediaButtons } from '../Media';
import { ParticipantsLayout } from '../Participant';

// TODO(burdon): Translations.
export const Call: FC<ThemedClassName> = ({ classNames }) => {
  const debugEnabled = useDebugMode();
  const {
    userMedia,
    peer,
    isSpeaking,
    pushedTracks,
    room: { ai, identity, otherUsers, updateUserState },
    setJoined,
    onTranscription,
  } = useRoomContext()!;

  // Broadcast status over swarm.
  useBroadcastStatus({ userMedia, peer, updateUserState, identity, pushedTracks, ai, speaking: isSpeaking });

  // Transcription.
  const edgeClient = useEdgeClient();
  useTranscription({ userMedia, identity, isSpeaking, ai, edgeClient });
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
  const sharing = userMedia.screenShareVideoTrack !== undefined;
  const canShareScreen =
    typeof navigator.mediaDevices !== 'undefined' && navigator.mediaDevices.getDisplayMedia !== undefined;

  return (
    <PullAudioTracks audioTracks={otherUsers.map((user) => user.tracks?.audio).filter(nonNullable)}>
      <div className={mx('flex flex-col grow overflow-hidden', classNames)}>
        <div className='flex flex-col h-full overflow-y-scroll'>
          <ParticipantsLayout identity={identity} users={otherUsers} debugEnabled={debugEnabled} />
        </div>

        <Toolbar.Root>
          <IconButton
            variant='destructive'
            label='Leave'
            onClick={() => {
              userMedia.turnScreenShareOff();
              setJoined(false);
            }}
            icon='ph--phone-x--regular'
          />
          <div className='grow'></div>
          <IconButton
            icon={ai.transcription.enabled ? 'ph--text-t--regular' : 'ph--text-t-slash--regular'}
            label={ai.transcription.enabled ? 'Start transcription' : 'Stop transcription'}
            onClick={handleToggleTranscription}
            iconOnly
          />
          <IconButton
            disabled={!canShareScreen || otherUserIsSharing}
            icon={sharing ? 'ph--selection--regular' : 'ph--selection-slash--regular'}
            label={sharing ? 'Screenshare' : 'Screenshare Off'}
            onClick={sharing ? userMedia.turnScreenShareOff : userMedia.turnScreenShareOn}
            iconOnly
          />
          <MediaButtons userMedia={userMedia} />
        </Toolbar.Root>
      </div>
    </PullAudioTracks>
  );
};

Call.displayName = 'Call';
