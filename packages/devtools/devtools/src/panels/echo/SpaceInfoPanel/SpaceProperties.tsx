//
// Copyright 2020 DXOS.org
//

import React, { type FC, useMemo } from 'react';

import { MulticastObservable } from '@dxos/async';
import { type Space } from '@dxos/client/echo';
import { SpaceState } from '@dxos/protocols/proto/dxos/client/services';
import { type SubscribeToSpacesResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { useMulticastObservable } from '@dxos/react-hooks';
import { Timeframe } from '@dxos/timeframe';

import { PropertiesTable, PropertySchemaFormat } from '../../../components';

export const SpaceProperties: FC<{ space: Space; metadata: SubscribeToSpacesResponse.SpaceInfo }> = ({
  space,
  metadata,
}) => {
  const pipelineState = useMulticastObservable(space?.pipeline ?? MulticastObservable.empty()); // Triggers refresh.

  const details = useMemo(async () => {
    if (!metadata) {
      return;
    }

    const pipeline = space?.internal.data?.pipeline;

    const currentEpochNumber = (pipeline?.currentEpoch?.subject as any)?.assertion?.number;
    const appliedEpochNumber = (pipeline?.appliedEpoch?.subject as any)?.assertion?.number;
    const epochTimeframe = (pipeline?.currentEpoch?.subject as any)?.assertion?.timeframe ?? new Timeframe();

    const targetControlMessages = (pipeline?.targetControlTimeframe as any)?.totalMessages() ?? 0;
    const currentControlMessages = (pipeline?.currentControlTimeframe as any)?.totalMessages() ?? 0;
    const controlProgress = Math.min(currentControlMessages / targetControlMessages, 1) * 100;

    const startDataMessages = (pipeline?.startDataTimeframe as any)?.totalMessages() ?? 0;
    const targetDataMessages = (pipeline?.targetDataTimeframe as any)?.totalMessages() ?? 0;
    const currentDataMessages = (pipeline?.currentDataTimeframe as any)?.totalMessages() ?? 0;
    const dataProgress =
      Math.min(Math.abs((currentDataMessages - startDataMessages) / (targetDataMessages - startDataMessages) || 1), 1) *
      100;

    const { open, ready } = space?.internal.data?.metrics ?? {};
    const startupTime = open && ready && (ready as any).getTime() - (open as any).getTime();

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
      epochMutations: (pipeline?.currentEpoch?.subject as any)?.assertion?.timeframe?.totalMessages(),
      mutationsSinceEpoch: (pipeline?.totalDataTimeframe as any)?.newMessages(epochTimeframe),
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
