//
// Copyright 2024 DXOS.org
//

import { pipe } from 'effect';
import React, { useEffect, type FC } from 'react';

import { chain, createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { type ReactiveEchoObject, type Space } from '@dxos/client/echo';
import { invariant } from '@dxos/invariant';
import { MarkdownAction } from '@dxos/plugin-markdown/types';
import { CollectionType, SpaceAction } from '@dxos/plugin-space/types';
import { Toolbar, type ThemedClassName, IconButton } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { nonNullable } from '@dxos/util';

import { PullAudioTracks } from './PullAudioTracks';
import { useRoomContext, useBroadcastStatus, useDebugMode, useTranscription } from '../../hooks';
import { type Transcription } from '../../types';
import { getTimeStr } from '../../utils';
import { MediaButtons } from '../Media';
import { ParticipantsLayout } from '../Participant';

// TODO(burdon): Translations.
export const Call: FC<ThemedClassName> = ({ classNames }) => {
  const debugEnabled = useDebugMode();
  const {
    space,
    userMedia,
    peer,
    isSpeaking,
    pushedTracks,
    room: { ai, identity, otherUsers, updateUserState },
    setJoined,
  } = useRoomContext()!;

  // Broadcast status over swarm.
  useBroadcastStatus({ userMedia, peer, updateUserState, identity, pushedTracks, ai, speaking: isSpeaking });

  // Create document.
  // TODO(burdon): Change to queue.
  const { dispatchPromise } = useIntentDispatcher();
  const transcriptionFolder = space.properties[CollectionType.typename]?.target;
  const createTranscriptionDocument = async (space: Space): Promise<ReactiveEchoObject<DocumentType>> => {
    const result = await dispatchPromise(
      pipe(
        createIntent(MarkdownAction.Create, { name: 'Transcription ' + getTimeStr() }),
        chain(SpaceAction.AddObject, { target: transcriptionFolder }),
      ),
    );

    invariant(result.data, 'Failed to create document');
    const { object } = result.data;
    return object as ReactiveEchoObject<DocumentType>; // TODO(burdon): Is this right?
  };

  // Transcription.
  const { turnTranscriptionOn, turnTranscriptionOff } = useTranscription({
    space,
    userMedia,
    identity,
    isSpeaking,
    ai,
  });
  useEffect(() => {
    ai.transcription.enabled ? turnTranscriptionOn() : turnTranscriptionOff();
  }, [ai.transcription.enabled]);
  const handleToggleTranscription = async () => {
    const transcription: Transcription = {
      ...ai.transcription,
      enabled: !ai.transcription.enabled,
      lamportTimestamp: ai.transcription.lamportTimestamp! + 1,
    };

    // Check not already running.
    if (!ai.transcription.enabled && !ai.transcription.objectId) {
      const document = await createTranscriptionDocument(space);
      ai.transcription.objectId = document.id;
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
              userMedia.turnMicOff();
              setJoined(false);
            }}
            icon='ph--phone-x--regular'
          />
          <div className='grow'></div>
          <IconButton
            disabled={!transcriptionFolder}
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
