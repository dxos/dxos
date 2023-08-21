//
// Copyright 2020 DXOS.org
//

import { formatDistance } from 'date-fns';
import React, { useEffect, useState } from 'react';

import { scheduleTaskInterval } from '@dxos/async';
import { createColumn, createTextColumn, defaultGridSlots, Grid, GridColumn } from '@dxos/aurora-grid';
import { Context } from '@dxos/context';
import { SignalStatus } from '@dxos/messaging';
import { SubscribeToSignalStatusResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { SignalState } from '@dxos/protocols/proto/dxos/mesh/signal';
import { useDevtools, useStream } from '@dxos/react-client/devtools';

const states = {
  [SignalState.CONNECTING]: { label: 'connecting', color: 'orange' },
  [SignalState.RECONNECTING]: { label: 'reconnecting', color: 'orange' },
  [SignalState.CONNECTED]: { label: 'connected', color: 'green' },
  [SignalState.DISCONNECTED]: { label: 'disconnected', color: 'red' },
  [SignalState.ERROR]: { label: 'error', color: 'red' },
  [SignalState.CLOSED]: { label: 'closed', color: 'darkgray' },
};

export interface SignalStatusProps {
  status: SignalStatus[];
}

const getSignalStatus = (server: SubscribeToSignalStatusResponse.SignalServer): SignalStatus => {
  return {
    connectionStarted: server.connectionStarted!,
    lastStateChange: server.lastStateChange!,
    reconnectIn: server.reconnectIn!,
    host: server.host!,
    state: server.state!,
  };
};

export const SignalStatusInfo = () => {
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

  const columns: GridColumn<SignalStatus>[] = [
    createTextColumn('host', { key: true, cell: { className: 'font-mono' } }),
    createColumn('state', {
      accessor: (status) => states[status.state].label,
      width: 80,
      cell: {
        render: ({ value, row }) => <span style={{ color: states[row.state]?.color }}>{value}</span>,
      },
    }),
    // TODO(burdon): Date.
    createColumn('connected', {
      accessor: (status) => {
        return status.state === SignalState.CONNECTED
          ? formatDistance(status.lastStateChange.getTime(), time.getTime(), { includeSeconds: true, addSuffix: true })
          : `Reconnecting ${formatDistance(status.lastStateChange.getTime() + status.reconnectIn, time.getTime(), {
              addSuffix: true,
            })}`;
      },
    }),
    createTextColumn('error'),
  ];

  return (
    <div>
      <Grid<SignalStatus> columns={columns} data={status} slots={defaultGridSlots} />
    </div>
  );
};
