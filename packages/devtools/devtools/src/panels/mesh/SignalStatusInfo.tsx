//
// Copyright 2020 DXOS.org
//

import { formatDistance } from 'date-fns';
import React, { useEffect, useState } from 'react';

import { scheduleTaskInterval } from '@dxos/async';
import { Context } from '@dxos/context';
import { SignalStatus } from '@dxos/messaging';
import { Table, TableColumn } from '@dxos/mosaic';
import { SubscribeToSignalStatusResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { SignalState } from '@dxos/protocols/proto/dxos/mesh/signal';
import { useDevtools, useStream } from '@dxos/react-client';

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

  const columns: TableColumn<SignalStatus>[] = [
    {
      Header: 'Host',
      width: 120,
      Cell: ({ value }: any) => <span className='font-mono text-sm'>{value}</span>,
      accessor: (status) => {
        return status.host;
      },
    },
    {
      Header: 'State',
      width: 40,
      Cell: ({ value, row }: any) => {
        const v: SignalState = row.original.state;
        return <span style={{ color: states[v]?.color }}>{value}</span>;
      },
      accessor: (status) => {
        const state = states[status.state];
        return state.label;
      },
    },
    {
      Header: 'Connected',
      width: 80,
      accessor: (status) => {
        return status.state === SignalState.CONNECTED
          ? formatDistance(status.lastStateChange.getTime(), time.getTime(), { includeSeconds: true, addSuffix: true })
          : `Reconnecting ${formatDistance(status.lastStateChange.getTime() + status.reconnectIn, time.getTime(), {
              addSuffix: true,
            })}`;
      },
    },
    {
      Header: 'Error',
      width: 160,
      accessor: (status) => {
        return status.error ?? 'none';
      },
    },
  ];

  return (
    <div>
      <Table compact columns={columns} data={status} />
    </div>
  );
};
