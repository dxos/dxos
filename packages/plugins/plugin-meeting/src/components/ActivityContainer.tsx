//
// Copyright 2024 DXOS.org
//

import { Effect } from 'effect';
import React, { useCallback, useEffect, type FC } from 'react';

import { createIntent, useCapability, useIntentDispatcher } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { createTree } from '@dxos/plugin-outliner/types';
import { type ChannelType } from '@dxos/plugin-space/types';
import { TranscriptionAction } from '@dxos/plugin-transcription/types';
import { create, fullyQualifiedId, getSpace, makeRef } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';
import { TextType } from '@dxos/schema';

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

export type ActivityContainerProps = {
  channel?: ChannelType;
  roomId?: string;
};

export const ActivityContainer: FC<ActivityContainerProps> = ({ channel, roomId: _roomId }) => {
  const { dispatch } = useIntentDispatcher();
  const call = useCapability(MeetingCapabilities.CallManager);
  const roomId = channel ? fullyQualifiedId(channel) : _roomId;
  invariant(roomId);

  useEffect(() => {
    if (!call.joined) {
      call.setRoomId(roomId);
    }
  }, [roomId, call.joined, call.roomId]);

  const handleTranscriptionStart = useCallback(
    () =>
      Effect.gen(function* () {
        const space = getSpace(channel);
        invariant(space);
        const { object: transcript } = yield* dispatch(createIntent(TranscriptionAction.Create, { spaceId: space.id }));
        const { object } = yield* dispatch(
          createIntent(MeetingAction.Create, {
            name: generateName(),
            participants: [],
            channel: channel ? makeRef(channel) : undefined,
            transcript: makeRef(transcript),
            notes: makeRef(createTree()),
            summary: makeRef(create(TextType, { content: '' })),
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
      {call.joined && call.roomId === roomId ? (
        <>
          <Call.Room />
          <Call.Toolbar onTranscriptionStart={handleTranscriptionStart} onTranscriptionStop={handleTranscriptionStop} />
        </>
      ) : (
        <Lobby roomId={roomId} />
      )}
    </StackItem.Content>
  );
};

export default ActivityContainer;
