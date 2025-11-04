//
// Copyright 2020 DXOS.org
//

import { formatDistance } from 'date-fns';
import React, { useEffect, useMemo, useState } from 'react';

import { scheduleTaskInterval } from '@dxos/async';
import { Context } from '@dxos/context';
import { FormatEnum } from '@dxos/echo/internal';
import { type SignalStatus } from '@dxos/messaging';
import { type SubscribeToSignalStatusResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { SignalState } from '@dxos/protocols/proto/dxos/mesh/signal';
import { useDevtools, useStream } from '@dxos/react-client/devtools';
import { DynamicTable, type TablePropertyDefinition } from '@dxos/react-ui-table';

export interface SignalStatusProps {
  status: SignalStatus[];
}

const getSignalStatus = (server: SubscribeToSignalStatusResponse.SignalServer): SignalStatus => ({
  connectionStarted: server.connectionStarted!,
  lastStateChange: server.lastStateChange!,
  reconnectIn: server.reconnectIn!,
  host: server.host!,
  state: server.state!,
});

const signalStateLabels = {
  [SignalState.CONNECTING]: 'CONNECTING',
  [SignalState.RECONNECTING]: 'RECONNECTING',
  [SignalState.CONNECTED]: 'CONNECTED',
  [SignalState.DISCONNECTED]: 'DISCONNECTED',
  [SignalState.ERROR]: 'ERROR',
  [SignalState.CLOSED]: 'CLOSED',
  UNKNOWN: 'UNKNOWN',
} as const;

const stateColors = {
  CONNECTING: 'orange',
  RECONNECTING: 'orange',
  CONNECTED: 'green',
  DISCONNECTED: 'orange',
  ERROR: 'red',
  CLOSED: 'neutral',
  UNKNOWN: 'neutral',
} as const;

const getStateLabel = (state: SignalState): string => signalStateLabels[state] ?? 'UNKNOWN';

const tableProperties: TablePropertyDefinition[] = [
  {
    name: 'host',
    format: FormatEnum.String,
    size: 240,
  },
  {
    name: 'status',
    format: FormatEnum.SingleSelect,
    size: 140,
    config: {
      options: Object.values(signalStateLabels).map((label) => ({
        id: label,
        title: label,
        color: stateColors[label],
      })),
    },
  },
  {
    name: 'connected',
    format: FormatEnum.String,
    size: 240,
  },
];

export const SignalStatusTable = () => {
  const devtoolsHost = useDevtools();
  const { servers } = useStream(() => devtoolsHost.subscribeToSignalStatus(), { servers: [] });
  const status = servers!.map(getSignalStatus);

  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const ctx = new Context();
    scheduleTaskInterval(
      ctx,
      async () => {
        setTime(new Date());
      },
      1000,
    );
    return () => {
      void ctx.dispose();
    };
  }, []);

  if (!servers) {
    return null;
  }

  const properties = useMemo(() => tableProperties, []);
  const rows = useMemo(
    () =>
      status.map((status, index) => ({
        id: `${index}-${status.host}`,
        host: new URL(status.host).origin,
        status: getStateLabel(status.state),
        connected:
          status.state === SignalState.CONNECTED
            ? formatDistance(status.lastStateChange.getTime(), time.getTime(), {
                includeSeconds: true,
                addSuffix: true,
              })
            : `Reconnecting ${formatDistance(time.getTime(), status.lastStateChange.getTime() + status.reconnectIn, {
                addSuffix: true,
              })}`,
        _original: status,
      })),
    [status, time],
  );

  return <DynamicTable properties={properties} rows={rows} />;
};
