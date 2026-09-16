//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type EdgeStatus } from '@dxos/protocols';
import {
  EdgeStatus_ConnectionState,
  type QueryEdgeStatusResponse,
  type EdgeStatus as SocketStatus,
} from '@dxos/protocols/buf/dxos/client/services_pb';

import { StatCard } from '../../../components/index.ts';
import { Unit } from '../util.tsx';

export type EdgeCardProps = {
  /** Websocket status from the client's edge stream. */
  edge?: QueryEdgeStatusResponse;
  /** Health report from the edge HTTP API. */
  status?: EdgeStatus;
  onRefresh?: () => void;
  onCopy?: () => void;
};

const OK = 'ph--check-circle--regular';
const FAIL = 'ph--x-circle--regular';

type HealthRow = { ok: boolean; label: string; value?: string; unit?: string };

const healthRows = (status?: EdgeStatus, socket?: SocketStatus): HealthRow[] => {
  const connected = socket?.state === EdgeStatus_ConnectionState.CONNECTED;
  const rows: HealthRow[] = [{ ok: connected, label: 'Websocket', value: connected ? 'connected' : 'disconnected' }];
  if (connected) {
    rows.push(
      { ok: true, label: 'Uptime', value: socket?.uptime?.toFixed(0) ?? 'N/A', unit: 's' },
      { ok: true, label: 'RTT', value: socket?.rtt?.toFixed(0) ?? 'N/A', unit: 'ms' },
      { ok: true, label: 'Up', value: Unit.KB(socket?.rateBytesUp ?? 0), unit: 'KB/s' },
      { ok: true, label: 'Down', value: Unit.KB(socket?.rateBytesDown ?? 0), unit: 'KB/s' },
    );
  }
  if (!status) {
    return rows;
  }

  const devices = status.router.connectedDevices?.length ?? 0;
  const spaces = Object.entries(status.spaces.data ?? {});
  rows.push(
    { ok: devices > 0 && !status.router.fetchError, label: 'Router', value: `${devices} devices` },
    { ok: status.agent.agentStatus === 'active', label: 'Agent', value: status.agent.agentStatus ?? 'unknown' },
    { ok: !status.spaces.fetchError, label: 'Spaces', value: spaces.length.toLocaleString() },
    ...spaces.map(([spaceId, space]) => ({
      ok: !((space.diagnostics?.redFlags?.length ?? 0) > 0 || space.fetchError),
      label: spaceId,
    })),
  );
  return rows;
};

export const EdgeCard = ({ edge, status, onRefresh, onCopy }: EdgeCardProps) => {
  const rows = healthRows(status, edge?.status);
  const problems = status?.problems ?? [];
  const menu = [
    ...(onRefresh ? [{ label: 'Refresh', icon: 'ph--arrow-clockwise--regular', onClick: onRefresh }] : []),
    ...(onCopy ? [{ label: 'Copy raw', icon: 'ph--copy--regular', onClick: onCopy }] : []),
  ];

  return (
    <StatCard.Root>
      <StatCard.Header
        icon='ph--cloud--regular'
        hue='blue'
        title='EDGE'
        info={status ? (problems.length === 0 ? 'healthy' : `${problems.length} issues`) : undefined}
        menu={menu.length > 0 ? menu : undefined}
      />
      {rows.map((row, index) => (
        <StatCard.Row
          key={index}
          icon={row.ok ? OK : FAIL}
          iconClassNames={row.ok ? 'text-success-text' : 'text-error-text'}
          label={row.label}
          title={row.label}
          value={row.value}
          unit={row.unit}
        />
      ))}
      {problems.map((problem, index) => (
        <StatCard.Row
          key={`problem-${index}`}
          icon='ph--warning--regular'
          iconClassNames='text-warning-text'
          label={problem}
          title={problem}
        />
      ))}
    </StatCard.Root>
  );
};

EdgeCard.displayName = 'EdgeCard';
