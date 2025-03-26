//
// Copyright 2020 DXOS.org
//

import { formatDistance } from 'date-fns';
import React, { useEffect, useMemo, useState } from 'react';

import { scheduleTaskInterval } from '@dxos/async';
import { Context } from '@dxos/context';
import { FormatEnum } from '@dxos/echo-schema';
import { type SignalStatus } from '@dxos/messaging';
import { type SubscribeToSignalStatusResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { SignalState } from '@dxos/protocols/proto/dxos/mesh/signal';
import { useDevtools, useStream } from '@dxos/react-client/devtools';
import { DynamicTable, type TablePropertyDefinition } from '@dxos/react-ui-table';

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

const getStateLabel = (state: SignalState): string => {
  return signalStateLabels[state] ?? 'UNKNOWN';
};

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

  const tableData = useMemo(() => {
    return status.map((s, index) => ({
      id: `${index}-${s.host}`,
      host: new URL(s.host).origin,
      status: getStateLabel(s.state),
      connected:
        s.state === SignalState.CONNECTED
          ? formatDistance(s.lastStateChange.getTime(), time.getTime(), { includeSeconds: true, addSuffix: true })
          : `Reconnecting ${formatDistance(time.getTime(), s.lastStateChange.getTime() + s.reconnectIn, {
              addSuffix: true,
            })}`,
      _original: s,
    }));
  }, [status, time]);

  return <DynamicTable properties={properties} data={tableData} />;
};
