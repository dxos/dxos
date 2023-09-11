//
// Copyright 2020 DXOS.org
//

import { formatDistance } from 'date-fns';
import React, { useEffect, useState } from 'react';

import { scheduleTaskInterval } from '@dxos/async';
import { createColumnBuilder, Table, TableColumnDef } from '@dxos/aurora-table';
import { Context } from '@dxos/context';
import { SignalStatus } from '@dxos/messaging';
import { SubscribeToSignalStatusResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { SignalState } from '@dxos/protocols/proto/dxos/mesh/signal';
import { useDevtools, useStream } from '@dxos/react-client/devtools';

const states = {
  [SignalState.CONNECTING]: {
    label: 'connecting',
    className: 'text-orange-500',
  },
  [SignalState.RECONNECTING]: {
    label: 'reconnecting',
    className: 'text-orange-500',
  },
  [SignalState.CONNECTED]: {
    label: 'connected',
    className: 'text-green-500',
  },
  [SignalState.DISCONNECTED]: {
    label: 'disconnected',
    className: 'text-orange-500',
  },
  [SignalState.ERROR]: {
    label: 'error',
    className: 'text-red-500',
  },
  [SignalState.CLOSED]: {
    label: 'closed',
    className: 'text-neutral-500',
  },
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

  const { helper } = createColumnBuilder<SignalStatus>();
  const columns: TableColumnDef<SignalStatus, any>[] = [
    helper.accessor((status) => new URL(status.host).origin, {
      id: 'host',
      cell: (props) => <div className='font-mono'>{props.getValue()}</div>,
      size: 240,
    }),
    helper.accessor((status) => states[status.state].label, {
      id: 'status',
      size: 120,
      cell: (cell) => <div className={states[cell.row.original.state]?.className}>{cell.getValue().toUpperCase()}</div>,
    }),
    // TODO(burdon): Date format helper.
    helper.accessor(
      (status) => {
        return status.state === SignalState.CONNECTED
          ? formatDistance(status.lastStateChange.getTime(), time.getTime(), { includeSeconds: true, addSuffix: true })
          : `Reconnecting ${formatDistance(status.lastStateChange.getTime() + status.reconnectIn, time.getTime(), {
              addSuffix: true,
            })}`;
      },
      { id: 'connected', size: 160 },
    ),
    helper.accessor('error', {}),
  ];

  return (
    <div>
      <Table<SignalStatus> columns={columns} data={status} />
    </div>
  );
};
