//
// Copyright 2024 DXOS.org
//

import { pipe } from 'effect';
import React, { useCallback, useEffect, type FC } from 'react';

import { chain, createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { CollectionType, SpaceAction } from '@dxos/plugin-space/types';
import { TranscriptionAction, type TranscriptType } from '@dxos/plugin-transcription/types';
import { type ReactiveEchoObject, type Space } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';

import { Call } from './Call';
import { type CallToolbarProps } from './Call/Toolbar';
import { CallContextProvider } from './CallContextProvider';
import { Lobby } from './Lobby';
import { useCallGlobalContext } from '../hooks';

export type CallContainerProps = {
  space: Space;
  roomId: PublicKey;
};

export const CallContainer: FC<CallContainerProps> = ({ space, roomId }) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const target = space?.properties[CollectionType.typename]?.target;
  const { call } = useCallGlobalContext();

  useEffect(() => {
    call.setRoomId(roomId);
  }, [roomId]);

  const handleTranscription = useCallback<NonNullable<CallToolbarProps['onTranscription']>>(async () => {
    invariant(target);
    const result = await dispatch(
      pipe(createIntent(TranscriptionAction.Create, {}), chain(SpaceAction.AddObject, { target })),
    );
    log.info('>>> handleTranscription', { result });
    invariant(result.data);
    return result.data.object as ReactiveEchoObject<TranscriptType>;
  }, [dispatch, space, target]);

  // TODO(burdon): Move RoomContextProvider to plugin.
  return (
    <CallContextProvider>
      <StackItem.Content toolbar={false} classNames='w-full'>
        {call.joined ? (
          <Call.Root>
            <Call.Room />
            <Call.Toolbar onTranscription={handleTranscription} />
          </Call.Root>
        ) : (
          <Lobby />
        )}
      </StackItem.Content>
    </CallContextProvider>
  );
};

export default CallContainer;
