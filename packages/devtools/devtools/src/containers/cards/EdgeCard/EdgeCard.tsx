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
import * as Button from '@dxos/react-ui/Button';
import * as Layout from '@dxos/react-ui/Layout';
import * as SystemButton from '@dxos/react-ui/SystemButton';
import * as Tooltip from '@dxos/react-ui/Tooltip';

import { STAT_CARD_HUES, StatCard } from '../../../components/index.ts';
import { Unit } from '../util.tsx';

/** What this device knows of a space EDGE reports. */
export type EdgeCardSpace = { name?: string; tag?: string };

export type EdgeCardProps = {
  /** Websocket status from the client's edge stream. */
  edge?: QueryEdgeStatusResponse;
  /** Health report from the edge HTTP API. */
  status?: EdgeStatus;
  /** The client's spaces by id; when given, EDGE spaces missing from it (deleted on this device) are hidden. */
  spaces?: Record<string, EdgeCardSpace>;
  onRefresh?: () => void;
  onCopy?: () => void;
};

type HealthRow = {
  ok: boolean;
  label: string;
  value?: string;
  unit?: string;
};

/** One problem EDGE reports for a space: a plain summary and the diagnostics behind it. */
type SpaceIssue = { summary: string; details: string[] };

type SpaceRow = {
  spaceId: string;
  label: string;
  local?: EdgeCardSpace;
  /** Documents EDGE holds for the space. */
  documents?: number;
  issues: SpaceIssue[];
};

type HealthReport = {
  connection: HealthRow[];
  services: HealthRow[];
  spaces: SpaceRow[];
};

/** The parts of EDGE's per-space diagnostics the issue details draw on. */
type SpaceDiagnostics = {
  redFlags?: string[];
  feedProcessingProgress?: Record<string, string>;
  members?: {
    activeConnections?: { replicating: boolean; deviceKey: string }[];
    agent?: { agentKey: string; agentInSpace: boolean };
  }[];
  echo?: { documentCount?: number; indexedChanges?: string };
};

type FlagExplanation = { summary: string; details?: (diagnostics: SpaceDiagnostics) => string[] };

/** EDGE's red flags, keyed by the exact text EDGE sends, in plain words with the diagnostics that raised them. */
const FLAG_EXPLANATIONS: Record<string, FlagExplanation> = {
  'Agent was activated for one of space members, but its feed was not found in space-stata-machine.': {
    summary: "A member's agent is active, but EDGE has not seen the agent join this space.",
    details: ({ members = [] }) =>
      members.flatMap(({ agent }) =>
        agent && !agent.agentInSpace ? [`Agent ${agent.agentKey.slice(0, 10)} is not in the space`] : [],
      ),
  },
  'Automerge WASM is broken in the replicator.': {
    summary: "EDGE's replicator for this space has a broken Automerge runtime.",
  },
  'Devices of the same identity have different sets of swarms.': {
    summary: "One member's devices have joined different swarms.",
  },
  'Error logs related to the space were found.': {
    summary: 'EDGE logged errors for this space.',
  },
  'Indexer is behind the replicator, some changes were not processed.': {
    summary: "EDGE's indexer is behind its replicator, so queries may miss recent changes.",
    details: ({ echo }) => (echo?.indexedChanges ? [`Indexed changes: ${echo.indexedChanges}`] : []),
  },
  'Online peer was not found in the replicator\'s "active peers" list.': {
    summary: 'A member device is connected to EDGE but is not syncing this space with it.',
    details: ({ members = [] }) =>
      members.flatMap(({ activeConnections = [] }) =>
        activeConnections.flatMap(({ replicating, deviceKey }) =>
          replicating ? [] : [`Device ${deviceKey} is online but not replicating`],
        ),
      ),
  },
  'Some credentials were not processed by space-state-machine, might be a gap in dependency timeframes.': {
    summary:
      "EDGE has not applied every credential in this space's feeds, so its view of members and keys may be stale.",
    details: ({ feedProcessingProgress = {} }) =>
      Object.entries(feedProcessingProgress).flatMap(([feedKey, progress]) => {
        const [processed, length] = progress.split(' / ').map(Number);
        return processed < length ? [`Feed ${feedKey}: ${processed} of ${length} blocks processed`] : [];
      }),
  },
  'Space members do not have common swarms, communication signalling might be broken.': {
    summary: 'Members share no swarm, so signalling between them may be broken.',
  },
  'spaceKey and/or genesisKey were not resolved for this frame, these are required for issuing agent credentials.': {
    summary: "EDGE has not resolved this space's key or genesis feed, so it cannot issue agent credentials for it.",
  },
};

const spaceIssues = (diagnostics: SpaceDiagnostics = {}, fetchError?: string): SpaceIssue[] => [
  ...(diagnostics.redFlags ?? []).map((flag) => {
    const explanation = FLAG_EXPLANATIONS[flag];
    return explanation
      ? { summary: explanation.summary, details: explanation.details?.(diagnostics) ?? [] }
      : { summary: flag, details: [] };
  }),
  ...(fetchError ? [{ summary: "EDGE could not load this space's diagnostics.", details: [fetchError] }] : []),
];

/** The space's name, else its first tag (system spaces have no name), else a short id. */
const spaceLabel = (spaceId: string, local?: EdgeCardSpace): string => local?.name || local?.tag || spaceId.slice(0, 8);

const healthReport = (
  status?: EdgeStatus,
  socket?: SocketStatus,
  localSpaces?: Record<string, EdgeCardSpace>,
): HealthReport => {
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

  const spaces = Object.entries(status.spaces.data ?? {})
    .filter(([spaceId]) => !localSpaces || spaceId in localSpaces)
    .map(([spaceId, space]): SpaceRow => {
      const local = localSpaces?.[spaceId];
      return {
        spaceId,
        label: spaceLabel(spaceId, local),
        local,
        documents: space.diagnostics?.echo?.documentCount,
        issues: spaceIssues(space.diagnostics, space.fetchError),
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label) || a.spaceId.localeCompare(b.spaceId));

  const devices = status.router.connectedDevices?.length ?? 0;
  return {
    connection,
    services: [
      { ok: devices > 0 && !status.router.fetchError, label: 'Router', value: `${devices} devices` },
      { ok: status.agent.agentStatus === 'active', label: 'Agent', value: status.agent.agentStatus ?? 'unknown' },
      { ok: !status.spaces.fetchError, label: 'Spaces', value: spaces.length.toLocaleString() },
    ],
    spaces,
  };
};

const HealthRows = ({ rows }: { rows: HealthRow[] }) => (
  <>
    {rows.map((row, index) => (
      <StatCard.Row
        key={index}
        icon={row.ok ? undefined : 'ph--warning--regular'}
        iconClassNames={row.ok ? 'text-success-text' : 'text-error-text'}
        label={row.label}
        tooltip={row.label}
        value={row.value}
        unit={row.unit}
      />
    ))}
  </>
);

/** Tooltip body for a space's label: what identifies it. */
const SpaceIdentity = ({ row }: { row: SpaceRow }) => (
  <Layout.Flex column gap='xs' classNames='max-w-80 text-xs'>
    {row.local?.name && <span>{row.local.name}</span>}
    {row.local?.tag && <span>{row.local.tag}</span>}
    <span className='font-mono'>{row.spaceId}</span>
  </Layout.Flex>
);

/** Tooltip body for a space's warning: each issue in plain words, with the diagnostics behind it. */
const SpaceIssues = ({ row }: { row: SpaceRow }) => (
  <Layout.Flex column gap='sm' classNames='max-w-80 text-xs'>
    {row.issues.map((issue, index) => (
      <Layout.Flex key={index} column gap='xs'>
        <span className='text-error-text'>{issue.summary}</span>
        {issue.details.map((detail, index) => (
          <span key={index} className='font-mono'>
            {detail}
          </span>
        ))}
      </Layout.Flex>
    ))}
  </Layout.Flex>
);

/** One row per space: the warning opens its issues, the label its identity, and the id copies from beside the label. */
const SpaceRows = ({ rows }: { rows: SpaceRow[] }) => (
  <>
    {rows.map((row) => (
      <StatCard.Row
        key={row.spaceId}
        control={
          row.issues.length > 0 && (
            <Tooltip.Trigger asChild content={<SpaceIssues row={row} />}>
              <Button.Root
                variant='ghost'
                size='sm'
                icon='ph--warning--regular'
                iconClassNames='text-error-text'
                iconOnly
                showTooltip={false}
                label={row.issues.length === 1 ? '1 issue' : `${row.issues.length} issues`}
              />
            </Tooltip.Trigger>
          )
        }
      >
        <Layout.Flex align='center' gap='xs' classNames='min-w-0'>
          <Tooltip.Trigger asChild content={<SpaceIdentity row={row} />}>
            <span className='truncate font-mono'>{row.label}</span>
          </Tooltip.Trigger>
          <SystemButton.Clipboard iconOnly label={row.spaceId} onCopy={() => row.spaceId} />
        </Layout.Flex>
        {row.documents !== undefined && (
          <span className='shrink-0 font-mono tabular-nums'>{row.documents.toLocaleString()} docs</span>
        )}
      </StatCard.Row>
    ))}
  </>
);

export const EdgeCard = ({ edge, status, spaces, onRefresh, onCopy }: EdgeCardProps) => {
  const report = healthReport(status, edge?.status, spaces);
  // EDGE's `problems` repeat each space's flags with an "in space <id>" suffix; count the shown spaces' issues instead,
  // so hidden spaces don't inflate the total.
  const issueCount =
    (status?.problems.filter((problem) => !problem.includes(' in space ')).length ?? 0) +
    report.spaces.reduce((count, row) => count + row.issues.length, 0);
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
        info={status ? (issueCount === 0 ? 'healthy' : `${issueCount} issues`) : undefined}
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
    </StatCard.Root>
  );
};

EdgeCard.displayName = 'EdgeCard';
