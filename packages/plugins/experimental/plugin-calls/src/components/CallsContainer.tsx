//
// Copyright 2024 DXOS.org
//

import { pipe } from 'effect';
import React, { useCallback, type FC } from 'react';

import { chain, createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { CollectionType, SpaceAction } from '@dxos/plugin-space/types';
import { type ReactiveEchoObject, type Space } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';

import { Calls, type CallsProps } from './Calls';
import { type TranscriptType, CallsAction } from '../types';

const CallsContainer: FC<CallsProps & { space: Space }> = ({ roomId, space }) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const target = space?.properties[CollectionType.typename]?.target;

  const handleTranscription = useCallback<NonNullable<CallsProps['onTranscription']>>(async () => {
    invariant(target);
    const result = await dispatch(pipe(createIntent(CallsAction.Create, {}), chain(SpaceAction.AddObject, { target })));
    invariant(result.data);
    return result.data.object as ReactiveEchoObject<TranscriptType>;
  }, [dispatch, space, target]);

  return (
    <StackItem.Content toolbar={false}>
      <Calls roomId={roomId} onTranscription={target ? handleTranscription : undefined} />
    </StackItem.Content>
  );
};

export default CallsContainer;
