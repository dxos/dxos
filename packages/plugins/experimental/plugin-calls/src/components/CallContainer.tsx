//
// Copyright 2024 DXOS.org
//

import { pipe } from 'effect';
import React, { useCallback, type FC } from 'react';

import { chain, createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { CollectionType, SpaceAction } from '@dxos/plugin-space/types';
import { type ReactiveEchoObject, type Space } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';

import { Call } from './Call';
import { CallContextProvider, type CallContextProviderProps } from './CallContextProvider';
import { Lobby } from './Lobby';
import { useCallContext } from '../hooks';
import { type TranscriptType, CallsAction } from '../types';

export type CallContainerProps = { space: Space; roomId: PublicKey };

export const CallContainer: FC<CallContainerProps> = ({ space, roomId }) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const target = space?.properties[CollectionType.typename]?.target;

  const handleTranscription = useCallback<NonNullable<CallContextProviderProps['onTranscription']>>(async () => {
    invariant(target);
    const result = await dispatch(pipe(createIntent(CallsAction.Create, {}), chain(SpaceAction.AddObject, { target })));
    invariant(result.data);
    return result.data.object as ReactiveEchoObject<TranscriptType>;
  }, [dispatch, space, target]);

  // TODO(burdon): Move RoomContextProvider to plugin.
  return (
    <CallContextProvider roomId={roomId} onTranscription={target ? handleTranscription : undefined}>
      <StackItem.Content toolbar={false} classNames='w-full'>
        <Container />
      </StackItem.Content>
    </CallContextProvider>
  );
};

const Container = () => {
  const { joined } = useCallContext();
  return joined ? <Call /> : <Lobby />;
};

export default CallContainer;
