//
// Copyright 2024 DXOS.org
//

import { pipe } from 'effect';
import React, { useCallback, useEffect, type FC } from 'react';

import { chain, createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { CollectionType, SpaceAction } from '@dxos/plugin-space/types';
import { TranscriptionAction, type TranscriptType } from '@dxos/plugin-transcription/types';
import { type ReactiveEchoObject, type Space } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';

import { Call, type CallToolbarProps } from './Call';
import { Lobby } from './Lobby';
import { useCallGlobalContext } from '../hooks';

export type CallContainerProps = {
  space: Space;
  roomId: string;
};

export const CallContainer: FC<CallContainerProps> = ({ space, roomId }) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const target = space?.properties[CollectionType.typename]?.target;
  const { call } = useCallGlobalContext();

  useEffect(() => {
    call.setRoomId(roomId);
  }, [roomId, call.joined]);

  const handleTranscription = useCallback<NonNullable<CallToolbarProps['onTranscription']>>(async () => {
    invariant(target);
    const result = await dispatch(
      pipe(createIntent(TranscriptionAction.Create, {}), chain(SpaceAction.AddObject, { target })),
    );
    invariant(result.data);
    return result.data.object as ReactiveEchoObject<TranscriptType>;
  }, [dispatch, space, target]);

  return (
    <StackItem.Content toolbar={false}>
      {call.joined ? (
        <>
          <Call.Room />
          <Call.Toolbar onTranscription={handleTranscription} />
        </>
      ) : (
        <Lobby />
      )}
    </StackItem.Content>
  );
};

export default CallContainer;
