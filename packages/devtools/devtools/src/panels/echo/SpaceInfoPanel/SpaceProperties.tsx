//
// Copyright 2020 DXOS.org
//

import React, { type FC, useMemo } from 'react';

import { MulticastObservable } from '@dxos/async';
import { type Space } from '@dxos/client/echo';
import { getCredentialAssertion } from '@dxos/credentials';
import { timeframeVectorNewMessages, timeframeVectorTotalMessages, timestampMs } from '@dxos/protocols/buf';
import { SpaceState } from '@dxos/protocols/buf/dxos/client/invitation_pb';
import { type SubscribeToSpacesResponse_SpaceInfo } from '@dxos/protocols/buf/dxos/devtools/host_pb';
import { useMulticastObservable } from '@dxos/react-hooks';

import { PropertiesTable, PropertySchemaFormat } from '../../../components';

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

    const currentEpochAssertion = pipeline?.currentEpoch?.subject
      ? getCredentialAssertion(pipeline.currentEpoch)
      : undefined;
    const appliedEpochAssertion = pipeline?.appliedEpoch?.subject
      ? getCredentialAssertion(pipeline.appliedEpoch)
      : undefined;
    const currentEpochNumber = (currentEpochAssertion as any)?.number;
    const appliedEpochNumber = (appliedEpochAssertion as any)?.number;
    const epochTimeframeVector = (currentEpochAssertion as any)?.timeframe;

    const targetControlMessages = timeframeVectorTotalMessages(pipeline?.targetControlTimeframe);
    const currentControlMessages = timeframeVectorTotalMessages(pipeline?.currentControlTimeframe);
    const controlProgress = Math.min(currentControlMessages / targetControlMessages, 1) * 100;

    const startDataMessages = timeframeVectorTotalMessages(pipeline?.startDataTimeframe);
    const targetDataMessages = timeframeVectorTotalMessages(pipeline?.targetDataTimeframe);
    const currentDataMessages = timeframeVectorTotalMessages(pipeline?.currentDataTimeframe);
    const dataProgress =
      Math.min(Math.abs((currentDataMessages - startDataMessages) / (targetDataMessages - startDataMessages) || 1), 1) *
      100;

    const { open, ready } = space?.internal.data?.metrics ?? {};
    const startupTime = open && ready ? timestampMs(ready) - timestampMs(open) : undefined;

    return {
      key: metadata.key,
      state: SpaceState[space.state.get()],
      startupTime,
      controlProgress,
      dataProgress,
      currentEpoch:
        currentEpochNumber === appliedEpochNumber
          ? currentEpochNumber
          : `${currentEpochNumber} (${appliedEpochNumber})`,
      epochCreated: pipeline?.currentEpoch?.issuanceDate,
      epochMutations: timeframeVectorTotalMessages(epochTimeframeVector),
      mutationsSinceEpoch: timeframeVectorNewMessages(pipeline?.totalDataTimeframe, epochTimeframeVector),
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
