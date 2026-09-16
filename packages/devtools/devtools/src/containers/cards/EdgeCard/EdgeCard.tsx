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
import { Flex, SystemIconButton, Tooltip } from '@dxos/react-ui';

import { STAT_CARD_HUES, StatCard } from '../../../components/index.ts';
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

type HealthRow = {
  ok: boolean;
  label: string;
  value?: string;
  unit?: string;
};

type SpaceRow = { ok: boolean; spaceId: string; flags: number };

type HealthReport = {
  connection: HealthRow[];
  services: HealthRow[];
  spaces: SpaceRow[];
};

const healthReport = (status?: EdgeStatus, socket?: SocketStatus): HealthReport => {
  const connected = socket?.state === EdgeStatus_ConnectionState.CONNECTED;
  const connection: HealthRow[] = [
    { ok: connected, label: 'Websocket', value: connected ? 'connected' : 'disconnected' },
  ];
  if (connected) {
    connection.push(
      { ok: true, label: 'Uptime', value: socket?.uptime?.toFixed(0) ?? 'N/A', unit: 's' },
      { ok: true, label: 'RTT', value: socket?.rtt?.toFixed(0) ?? 'N/A', unit: 'ms' },
      { ok: true, label: 'Up', value: Unit.KB(socket?.rateBytesUp ?? 0), unit: 'KB/s' },
      { ok: true, label: 'Down', value: Unit.KB(socket?.rateBytesDown ?? 0), unit: 'KB/s' },
    );
  }
  if (!status) {
    return { connection, services: [], spaces: [] };
  }

  const devices = status.router.connectedDevices?.length ?? 0;
  const spaces = Object.entries(status.spaces.data ?? {});
  return {
    connection,
    services: [
      { ok: devices > 0 && !status.router.fetchError, label: 'Router', value: `${devices} devices` },
      { ok: status.agent.agentStatus === 'active', label: 'Agent', value: status.agent.agentStatus ?? 'unknown' },
      { ok: !status.spaces.fetchError, label: 'Spaces', value: spaces.length.toLocaleString() },
    ],
    spaces: spaces.map(([spaceId, space]) => {
      const flags = space.diagnostics?.redFlags?.length ?? 0;
      return { ok: !(flags > 0 || space.fetchError), spaceId, flags };
    }),
  };
};

const HealthRows = ({ rows }: { rows: HealthRow[] }) => (
  <>
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
  </>
);

/** One row per space: a copyable id chip (as the Sync card) and the red-flag count. */
const SpaceRows = ({ rows }: { rows: SpaceRow[] }) => (
  <>
    {rows.map((row) => (
      <StatCard.Row
        key={row.spaceId}
        icon={row.ok ? OK : FAIL}
        iconClassNames={row.ok ? 'text-success-text' : 'text-error-text'}
      >
        <Flex align='center' justify='between' gap='sm'>
          <Tooltip.Trigger asChild content={row.spaceId}>
            <SystemIconButton.Clipboard
              density='sm'
              variant='ghost'
              compact
              iconEnd
              classNames='font-mono'
              label={row.spaceId.slice(0, 8)}
              onCopy={() => row.spaceId}
            />
          </Tooltip.Trigger>
          {row.flags > 0 && <span className='shrink-0 font-mono tabular-nums text-error-text'>{row.flags} flags</span>}
        </Flex>
      </StatCard.Row>
    ))}
  </>
);

export const EdgeCard = ({ edge, status, onRefresh, onCopy }: EdgeCardProps) => {
  const report = healthReport(status, edge?.status);
  const problems = status?.problems ?? [];
  const menu = [
    ...(onRefresh ? [{ label: 'Refresh', icon: 'ph--arrow-clockwise--regular', onClick: onRefresh }] : []),
    ...(onCopy ? [{ label: 'Copy raw', icon: 'ph--copy--regular', onClick: onCopy }] : []),
  ];

  return (
    <StatCard.Root>
      <StatCard.Header
        icon='ph--cloud--regular'
        hue={STAT_CARD_HUES.edge}
        title='EDGE'
        info={status ? (problems.length === 0 ? 'healthy' : `${problems.length} issues`) : undefined}
        menu={menu.length > 0 ? menu : undefined}
      />
      <StatCard.Section title='Connection'>
        <HealthRows rows={report.connection} />
      </StatCard.Section>
      {report.services.length > 0 && (
        <StatCard.Section title='Services'>
          <HealthRows rows={report.services} />
        </StatCard.Section>
      )}
      {report.spaces.length > 0 && (
        <StatCard.Section title='Spaces'>
          <SpaceRows rows={report.spaces} />
        </StatCard.Section>
      )}
      {problems.length > 0 && (
        <StatCard.Section title='Issues'>
          {problems.map((problem, index) => (
            <StatCard.Row
              key={index}
              icon='ph--warning--regular'
              iconClassNames='text-warning-text'
              span
              label={problem}
              title={problem}
            />
          ))}
        </StatCard.Section>
      )}
    </StatCard.Root>
  );
};

EdgeCard.displayName = 'EdgeCard';
