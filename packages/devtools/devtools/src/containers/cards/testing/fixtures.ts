//
// Copyright 2026 DXOS.org
//

import { create } from '@bufbuild/protobuf';

import { type EchoDataStats } from '@dxos/echo-host';
import { SpaceId } from '@dxos/keys';
import { ConnectionState } from '@dxos/network-manager';
import { type EdgeStatus } from '@dxos/protocols';
import {
  EdgeStatus_ConnectionState,
  NetworkStatusSchema,
  QueryEdgeStatusResponseSchema,
} from '@dxos/protocols/buf/dxos/client/services_pb';
import { type FeedSyncState, type PeerSyncState } from '@dxos/react-client/echo';

import {
  type DatabaseInfo,
  type MemoryInfo,
  type PerformanceEntryLike,
  type QueryInfo,
  type ReceivedMessage,
  type Stats,
  type SyncRow,
} from '../../../hooks/index.ts';
import { type SurfaceProfilerStats } from '../SurfaceProfilerCard/index.ts';

export const memory: MemoryInfo = {
  jsHeapSizeLimit: 4_294_705_152,
  totalJSHeapSize: 96_468_992,
  usedJSHeapSize: 44_126_208,
  used: 0.46,
};

export const dataStats: EchoDataStats = {
  meta: { rateAverageOverSeconds: 10 },
  storage: {
    reads: { countPerSecond: 12.4, payloadSize: 18_432, opDuration: 3.2 },
    writes: { countPerSecond: 1.8, payloadSize: 4_096, opDuration: 7.9 },
  },
  replicator: {
    connections: 3,
    receivedMessages: { countPerSecond: 9.1, payloadSize: 2_048 },
    sentMessages: { countPerSecond: 4.2, payloadSize: 1_024, opDuration: 12.5, failedPerSecond: 0 },
    avgSizeByMessage: { sync: 1_024, request: 256, response: 3_072 },
    countByMessage: {
      sync: { sent: 120, received: 118 },
      request: { sent: 14, received: 9 },
      response: { sent: 9, received: 14 },
    },
  },
};

export const database: DatabaseInfo = {
  spaces: 4,
  objects: { alive: 1_284, deleted: 37 },
  storedDocuments: 1_412,
  feeds: { count: 8, blocks: 2_310 },
  documents: 312,
  documentsToReconcile: 5,
  dataStats,
};

export const network = create(NetworkStatusSchema, {
  connectionInfo: [
    { label: 'space-1', connections: [{ state: ConnectionState.CONNECTED }, { state: ConnectionState.CONNECTED }] },
    { label: 'space-2', connections: [{ state: ConnectionState.CONNECTING }] },
    { label: 'halo', connections: [{ state: ConnectionState.CONNECTED }] },
  ],
});

export const edgeSocket = create(QueryEdgeStatusResponseSchema, {
  status: {
    state: EdgeStatus_ConnectionState.CONNECTED,
    rtt: 42,
    uptime: 3_620,
    rateBytesUp: 1_240,
    rateBytesDown: 8_912,
  },
});

export const edgeStatus: EdgeStatus = {
  problems: [],
  agent: { agentStatus: 'active' },
  router: { connectedDevices: [{ peerKey: 'a', topics: ['t1'] }] },
  spaces: {
    data: {
      [SpaceId.make('BPLB437SM5NPSBRYIOOLPJSWOW4O3RV4N')]: { diagnostics: { redFlags: [] } },
      [SpaceId.make('B27NKHVKACJKNOTBRFH46MNYBBAB3NLZF')]: { diagnostics: { redFlags: [] } },
    },
  },
};

export const edgeSpaceNames: Record<string, string> = {
  BPLB437SM5NPSBRYIOOLPJSWOW4O3RV4N: 'Personal Space',
  B27NKHVKACJKNOTBRFH46MNYBBAB3NLZF: 'Acme Robotics',
};

export const edgeStatusDegraded: EdgeStatus = {
  problems: [
    'Agent is not reachable.',
    'Router fetch timed out.',
    'Some credentials were not processed by space-state-machine, might be a gap in dependency timeframes. in space BUM5S2UIPZQQLMY3YNTT7UXBTN2MHM7DN',
  ],
  agent: { agentStatus: 'inactive' },
  router: { fetchError: 'timeout' },
  spaces: {
    data: {
      [SpaceId.make('BPLB437SM5NPSBRYIOOLPJSWOW4O3RV4N')]: { diagnostics: { redFlags: [] } },
      [SpaceId.make('B27NKHVKACJKNOTBRFH46MNYBBAB3NLZF')]: { diagnostics: { redFlags: ['feed lag', 'missing epoch'] } },
      [SpaceId.make('BUM5S2UIPZQQLMY3YNTT7UXBTN2MHM7DN')]: { fetchError: 'timeout' },
    },
  },
};

export const performanceEntries: PerformanceEntryLike[] = [
  { entryType: 'paint', name: 'first-paint', duration: 0 },
  { entryType: 'paint', name: 'first-contentful-paint', duration: 0 },
  { entryType: 'longtask', name: 'self', duration: 312 },
  { entryType: 'longtask', name: 'self', duration: 84 },
  { entryType: 'largest-contentful-paint', name: '', duration: 0 },
];

export const queries: QueryInfo[] = [
  {
    filter: { type: { itemId: 'dxos.org/type/Document' }, options: { deleted: 'exclude' } },
    metrics: { objectsReturned: 42, executionTime: 12 },
    active: true,
  },
  {
    filter: { type: { itemId: 'dxos.org/type/Task' }, props: { completed: false } },
    metrics: { objectsReturned: 7, executionTime: 310 },
    active: true,
  },
  {
    filter: { type: { itemId: 'dxos.org/type/Contact' } },
    metrics: { objectsReturned: 0, executionTime: 3 },
    active: false,
  },
];

export const surfaceProfilerStats: SurfaceProfilerStats[] = [
  {
    id: 'surface/deck/org.dxos.role.article',
    mountCount: 1,
    updateCount: 24,
    totalRenders: 25,
    avgActualDuration: 4.2,
    maxActualDuration: 31.5,
    avgBaseDuration: 3.1,
    lastActualDuration: 2.8,
    lastCommitTime: Date.now(),
    candidates: 3,
  },
  {
    id: 'surface/sidebar/org.dxos.role.navigation',
    mountCount: 1,
    updateCount: 210,
    totalRenders: 211,
    avgActualDuration: 18.9,
    maxActualDuration: 64.0,
    avgBaseDuration: 12.0,
    lastActualDuration: 22.1,
    lastCommitTime: Date.now(),
    candidates: 1,
    dataUnstable: true,
  },
  {
    id: 'surface/status/org.dxos.role.statusIndicator',
    mountCount: 2,
    updateCount: 3,
    totalRenders: 5,
    avgActualDuration: 0.6,
    maxActualDuration: 1.2,
    avgBaseDuration: 0.5,
    lastActualDuration: 0.4,
    lastCommitTime: Date.now(),
    candidates: 4,
    truncated: true,
    errors: 1,
  },
];

const syncState = (settled: boolean, total: number): PeerSyncState => ({
  localDocumentCount: settled ? total : Math.floor(total / 2),
  remoteDocumentCount: total,
  missingOnLocal: settled ? 0 : Math.ceil(total / 2),
  missingOnRemote: 0,
  differentDocuments: 0,
  totalDocumentCount: total,
  unsyncedDocumentCount: settled ? 0 : Math.ceil(total / 2),
});

const feedState = (pending: number, total: number): FeedSyncState => ({ pending, total });

export const syncRows: SyncRow[] = [
  { spaceId: 'B4RQ7KM2ZP9VJ6TW', name: 'Personal Space', state: syncState(true, 120), feedState: feedState(0, 12) },
  { spaceId: 'BQ8ZT3NX5MC2HD7K', name: 'Acme Robotics', state: syncState(false, 480), feedState: feedState(31, 96) },
  { spaceId: 'BM6WP9RV4KT8XA2J', name: 'New space', state: syncState(true, 3) },
];

const traceMessage = (index: number, type: string, space: string): ReceivedMessage => ({
  id: String(index),
  receivedAt: Date.now() - (10 - index) * 1_250,
  message: {
    meta: { space },
    events: [{ type, timestamp: Date.now() - (10 - index) * 1_250 - 40, data: undefined }],
  },
});

export const traceMessages: ReceivedMessage[] = [
  traceMessage(1, 'sync.start', 'B4RQ7KM2ZP9VJ6TW'),
  traceMessage(2, 'sync.progress', 'B4RQ7KM2ZP9VJ6TW'),
  traceMessage(3, 'operation.invoke', 'BQ8ZT3NX5MC2HD7K'),
  traceMessage(4, 'sync.complete', 'B4RQ7KM2ZP9VJ6TW'),
];

export const stats: Stats = {
  memory,
  database,
  network,
  edge: edgeSocket,
  queries,
  performanceEntries,
};

/** What the stack passes as `detail` for the selected role: each mounted surface's id, data and metric. */
export const surfaceDetail = [
  {
    id: 'deck',
    data: { subject: { 'id': '01J9Z4Q5K8M2N7P3R6T9V1W4X7', 'name': 'Roadmap', '@type': 'dxos.org/type/Document' } },
    metric: { id: 'surface/deck/org.dxos.role.article', dispatches: 3, candidates: 1, mounts: 1, unmounts: 0 },
  },
];
