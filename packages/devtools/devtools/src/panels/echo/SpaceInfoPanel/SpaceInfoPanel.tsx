//
// Copyright 2020 DXOS.org
//

import React, { FC, useMemo } from 'react';

import { MulticastObservable } from '@dxos/async';
import { Toolbar } from '@dxos/aurora';
import { SpaceState } from '@dxos/protocols/proto/dxos/client/services';
import { useMulticastObservable } from '@dxos/react-async';
import { Timeframe } from '@dxos/timeframe';
import { humanize } from '@dxos/util';

import { DetailsTable, PanelContainer } from '../../../components';
import { SpaceSelector } from '../../../containers';
import { useDevtoolsState, useSpacesInfo } from '../../../hooks';
import { PipelineTable } from './PipelineTable';

export const SpaceInfoPanel: FC = () => {
  const { space } = useDevtoolsState();
  const spacesInfo = useSpacesInfo();
  const metadata = space?.key && spacesInfo.find((info) => info.key.equals(space?.key));
  const pipelineState = useMulticastObservable(space?.pipeline ?? MulticastObservable.empty());

  // TODO(burdon): Factor out.
  // TODO(dmaretskyi): We don't need SpaceInfo anymore?
  const object = useMemo(() => {
    if (!metadata) {
      return undefined;
    }

    const pipeline = space?.internal.data?.pipeline;
    const epochTimeframe = pipeline?.currentEpoch?.subject.assertion.timeframe ?? new Timeframe();
    const currentEpochNumber = pipeline?.currentEpoch?.subject.assertion.number;
    const appliedEpochNumber = pipeline?.appliedEpoch?.subject.assertion.number;

    const targetControlMessages = pipeline?.targetControlTimeframe?.totalMessages() ?? 0;
    const currentControlMessages = pipeline?.currentControlTimeframe?.totalMessages() ?? 0;

    const startDataMessages = pipeline?.startDataTimeframe?.totalMessages() ?? 0;
    const targetDataMessages = pipeline?.targetDataTimeframe?.totalMessages() ?? 0;
    const currentDataMessages = pipeline?.currentDataTimeframe?.totalMessages() ?? 0;

    const controlProgress = Math.min(currentControlMessages / targetControlMessages, 1);
    const dataProgress = Math.min(
      Math.abs((currentDataMessages - startDataMessages) / (targetDataMessages - startDataMessages) || 1),
      1,
    );

    const { open, ready } = space?.internal.data?.metrics ?? {};
    const startupTime = open && ready && ready.getTime() - open.getTime();

    // TODO(burdon): Factor out numbers, units, formatting, etc. to DetailsTable. Builder.
    return {
      id: metadata.key.truncate(),
      name: space.properties.name ?? humanize(metadata?.key),
      state: SpaceState[space.state.get()] ?? 'Unknown',
      currentEpoch:
        currentEpochNumber === appliedEpochNumber
          ? currentEpochNumber
          : `${currentEpochNumber} (${appliedEpochNumber})`,
      epochStashedMutations: pipeline?.currentEpoch?.subject.assertion.timeframe.totalMessages().toLocaleString() ?? 0,
      currentEpochTime: pipeline?.currentEpoch?.issuanceDate?.toISOString(),
      mutationsAfterEpoch: pipeline?.totalDataTimeframe?.newMessages(epochTimeframe).toLocaleString(),
      controlProgress: `${(controlProgress * 100).toFixed(1)}%`,
      dataProgress: `${(dataProgress * 100).toFixed(1)}%`,
      startupTime: startupTime && `${startupTime.toLocaleString()}ms`,
      // ...Object.fromEntries(Object.entries(space?.internal.data?.metrics ?? {}).map(([key, value]) => [`metrics.${key}`, value?.toISOString()])),
    };
  }, [metadata, pipelineState, space]);

  const toggleActive = async () => {
    const state = space!.state.get();
    if (state === SpaceState.INACTIVE) {
      await space!.internal.open();
    } else {
      await space!.internal.close();
    }
  };

  return (
    <PanelContainer
      toolbar={
        <Toolbar.Root>
          <SpaceSelector />
          <Toolbar.Button onClick={toggleActive}>
            {space?.state.get() === SpaceState.INACTIVE ? 'Open' : 'Close'}
          </Toolbar.Button>
        </Toolbar.Root>
      }
    >
      <div className='flex flex-col'>
        {object && <DetailsTable object={object} />}
        <PipelineTable state={pipelineState ?? {}} metadata={metadata} />
      </div>
    </PanelContainer>
  );
};
