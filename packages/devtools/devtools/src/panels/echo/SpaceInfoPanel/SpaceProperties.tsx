//
// Copyright 2020 DXOS.org
//

import { type Any, anyUnpack } from '@bufbuild/protobuf/wkt';
import React, { type FC, useMemo } from 'react';

import { MulticastObservable } from '@dxos/async';
import { type Space } from '@dxos/client/echo';
import { toDate, toPublicKey, toTimeframe } from '@dxos/protocols/buf';
import { SpaceState } from '@dxos/protocols/buf/dxos/client/invitation_pb';
import { type SubscribeToSpacesResponse_SpaceInfo } from '@dxos/protocols/buf/dxos/devtools/host_pb';
import { EpochSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { useMulticastObservable } from '@dxos/react-hooks';
import { Timeframe } from '@dxos/timeframe';

import { PropertiesTable, PropertySchemaFormat } from '../../../components/index.ts';

export const SpaceProperties: FC<{ space: Space; metadata: SubscribeToSpacesResponse_SpaceInfo }> = ({
  space,
  metadata,
}) => {
  const pipelineState = useMulticastObservable(space?.pipeline ?? MulticastObservable.empty()); // Triggers refresh.

  const details = useMemo(async () => {
    if (!metadata) {
      return;
    }

    const pipeline = space?.internal.data?.pipeline;

    const unpackEpoch = (assertion: Any | undefined) => assertion && anyUnpack(assertion, EpochSchema);
    const currentEpoch = unpackEpoch(pipeline?.currentEpoch?.subject?.assertion);
    const currentEpochNumber = currentEpoch?.number;
    const appliedEpochNumber = unpackEpoch(pipeline?.appliedEpoch?.subject?.assertion)?.number;
    const epochTimeframe = currentEpoch ? toTimeframe(currentEpoch.timeframe) : new Timeframe();

    const targetControlMessages = toTimeframe(pipeline?.targetControlTimeframe).totalMessages();
    const currentControlMessages = toTimeframe(pipeline?.currentControlTimeframe).totalMessages();
    const controlProgress = Math.min(currentControlMessages / targetControlMessages, 1) * 100;

    const startDataMessages = toTimeframe(pipeline?.startDataTimeframe).totalMessages();
    const targetDataMessages = toTimeframe(pipeline?.targetDataTimeframe).totalMessages();
    const currentDataMessages = toTimeframe(pipeline?.currentDataTimeframe).totalMessages();
    const dataProgress =
      Math.min(Math.abs((currentDataMessages - startDataMessages) / (targetDataMessages - startDataMessages) || 1), 1) *
      100;

    const openedAt = toDate(space?.internal.data?.metrics?.open);
    const readyAt = toDate(space?.internal.data?.metrics?.ready);
    const startupTime = openedAt && readyAt && readyAt.getTime() - openedAt.getTime();

    return {
      key: toPublicKey(metadata.key),
      state: SpaceState[space.state.get()],
      startupTime,
      controlProgress,
      dataProgress,
      currentEpoch:
        currentEpochNumber === appliedEpochNumber
          ? currentEpochNumber
          : `${currentEpochNumber} (${appliedEpochNumber})`,
      epochCreated: toDate(pipeline?.currentEpoch?.issuanceDate),
      epochMutations: currentEpoch && toTimeframe(currentEpoch.timeframe).totalMessages(),
      mutationsSinceEpoch: toTimeframe(pipeline?.totalDataTimeframe).newMessages(epochTimeframe),
    };
  }, [space, metadata, pipelineState]);

  const schema = useMemo(
    () => ({
      key: PropertySchemaFormat.key(),
      startupTime: PropertySchemaFormat.number('ms'),
      controlProgress: PropertySchemaFormat.percent(1),
      dataProgress: PropertySchemaFormat.percent(1),
      epochCreated: PropertySchemaFormat.date({ format: 'MM:dd HH:mm:ss', relative: true }),
      epochMutations: PropertySchemaFormat.number(),
      mutationsSinceEpoch: PropertySchemaFormat.number(),
    }),
    [],
  );

  if (!details) {
    return null;
  }

  return <PropertiesTable schema={schema} object={details} />;
};
