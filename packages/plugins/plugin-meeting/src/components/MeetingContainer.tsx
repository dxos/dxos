//
// Copyright 2024 DXOS.org
//

import { Effect } from 'effect';
import React, { useCallback, useEffect, type FC } from 'react';

import { createIntent, useCapability, useIntentDispatcher } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { type ChannelType } from '@dxos/plugin-space/types';
import { TranscriptionAction } from '@dxos/plugin-transcription/types';
import { fullyQualifiedId, getSpace, makeRef } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';

import { Call } from './Call';
import { Lobby } from './Lobby';
import { MeetingCapabilities } from '../capabilities';
import { MeetingAction, type MeetingType } from '../types';

const generateName = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const hours = String(today.getHours()).padStart(2, '0');
  const minutes = String(today.getMinutes()).padStart(2, '0');
  return `${year}/${month}/${day} ${hours}:${minutes}`;
};

export type MeetingContainerProps = {
  channel?: ChannelType;
  roomId?: string;
};

export const MeetingContainer: FC<MeetingContainerProps> = ({ channel, roomId: _roomId }) => {
  const { dispatch } = useIntentDispatcher();
  const call = useCapability(MeetingCapabilities.CallManager);

  useEffect(() => {
    const roomId = channel ? fullyQualifiedId(channel) : _roomId;
    invariant(roomId);
    call.setRoomId(roomId);
  }, [channel, call.joined]);

  const handleTranscriptionStart = useCallback(
    () =>
      Effect.gen(function* () {
        const space = getSpace(channel);
        invariant(space);
        const { object: transcript } = yield* dispatch(createIntent(TranscriptionAction.Create));
        const { object } = yield* dispatch(
          createIntent(MeetingAction.Create, {
            name: generateName(),
            participants: [],
            channel: channel ? makeRef(channel) : undefined,
            transcript: makeRef(transcript),
          }),
        );
        // NOTE: Not using intent as these should not be directly added to a collection.
        space.db.add(object);
        return object;
      }),
    [dispatch, channel],
  );

  // TODO(wittjosiah): On transcription stop, update meeting participants.
  const handleTranscriptionStop = useCallback(
    (meeting: MeetingType) => Effect.gen(function* () {}),
    [dispatch, channel],
  );

  return (
    <StackItem.Content toolbar={false}>
      {call.joined ? (
        <>
          <Call.Room />
          <Call.Toolbar onTranscriptionStart={handleTranscriptionStart} onTranscriptionStop={handleTranscriptionStop} />
        </>
      ) : (
        <Lobby />
      )}
    </StackItem.Content>
  );
};

export default MeetingContainer;
