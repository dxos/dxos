//
// Copyright 2023 DXOS.org
//

import os from 'node:os';

import { type Agent } from '@dxos/agent';
import { Event, runInContext, scheduleTaskInterval } from '@dxos/async';
import { type LocalClientServices } from '@dxos/client/services';
import { type Space } from '@dxos/client-protocol';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { ConnectionState } from '@dxos/network-manager';
import * as Datadog from '@dxos/observability/datadog';
import { type NetworkStatus } from '@dxos/protocols/proto/dxos/client/services';

import { mapSpaces } from './spaces';
import { type TelemetryContext } from './telemetry';
import config from './telemetryrc.json';

export const DATADOG_API_KEY = config.DATADOG_API_KEY ?? undefined;
export const DATADOG_APP_KEY = config.DATADOG_APP_KEY ?? undefined;

// Do not report metrics more frequently than this.
const SPACE_METRICS_MIN_INTERVAL = 1000 * 60;

const DATADOG_IDLE_INTERVAL = 1000 * 60 * 5;

export const initMetrics = (telemetryContext: TelemetryContext): boolean => {
  // TODO(nf): move to observability
  const { mode } = telemetryContext;
  if (DATADOG_API_KEY && mode !== 'disabled') {
    Datadog.init({
      apiKey: DATADOG_API_KEY,
      // TODO(nf): move/refactor from telementryContext
      host: os.hostname(),
    });

    return true;
  }
  return false;
};

export const initAgentMetrics = (ctx: Context, startTime: Date) => {
  const sendDatadogAgentMetrics = async () => {
    const memUsage = process.memoryUsage();
    Datadog.gauge('dxos.agent.run.duration', Date.now() - startTime.getTime());
    Datadog.gauge('memory.rss', memUsage.rss);
    Datadog.gauge('memory.heapTotal', memUsage.heapTotal);
    Datadog.gauge('memory.heapUsed', memUsage.heapUsed);

    Datadog.flush();
  };
  runInContext(ctx, sendDatadogAgentMetrics);
  scheduleTaskInterval(ctx, sendDatadogAgentMetrics, 1000 * 60);
};

export const initClientMetrics = (ctx: Context, agent: Agent) => {
  // TODO(nf): refactor into observability package
  invariant(agent?.client);

  // Spaces.
  const spaceMetricsCtx = new Context();
  const subscriptions = new Map<string, { unsubscribe: () => void }>();

  spaceMetricsCtx.onDispose(() => subscriptions.forEach((subscription) => subscription.unsubscribe()));

  const updateSpaceMetrics = new Event<Space>().debounce(SPACE_METRICS_MIN_INTERVAL);
  updateSpaceMetrics.on(spaceMetricsCtx, async () => {
    log('send space update', { spaces });
    // TODO(nf): observe and send metrics individually
    // TODO(nf): emit metric for epoch generation/application
    // TODO(nf): emit metric on space readiness

    for (const sp of mapSpaces(spaces, { truncateKeys: true })) {
      Datadog.gauge('dxos.agent.space.members', sp.members, { key: sp.key });
      Datadog.gauge('dxos.agent.space.objects', sp.objects, { key: sp.key });
      Datadog.gauge('dxos.agent.space.epoch', sp.epoch, { key: sp.key });
      Datadog.gauge('dxos.agent.space.currentDataMutations', sp.currentDataMutations, { key: sp.key });
    }
  });

  const subscribeToSpaceUpdate = (space: Space) =>
    space.pipeline.subscribe({
      next: () => {
        updateSpaceMetrics.emit();
      },
    });

  let spaces = agent.client.spaces.get();

  spaces.forEach((space) => {
    subscriptions.set(space.key.toHex(), subscribeToSpaceUpdate(space));
  });

  agent.client.spaces.subscribe({
    next: async () => {
      invariant(agent?.client);
      spaces = agent.client.spaces.get();
      spaces
        .filter((space) => !subscriptions.has(space.key.toHex()))
        .forEach((space) => {
          subscriptions.set(space.key.toHex(), subscribeToSpaceUpdate(space));
        });
    },
  });

  scheduleTaskInterval(ctx, async () => updateSpaceMetrics.emit(), DATADOG_IDLE_INTERVAL);

  // Signaling.

  const lcsh = (agent.clientServices as LocalClientServices).host;
  invariant(lcsh, 'LocalClientServices is not available.');

  const updateSignalMetrics = new Event().debounce(SPACE_METRICS_MIN_INTERVAL);
  updateSignalMetrics.on(ctx, async () => {
    lcsh.context.signalManager.getStatus().forEach(({ host, state }) => {
      Datadog.gauge('dxos.agent.network.signal.connectionState', state, { server: host });
    });
  });

  agent.client.services.services.NetworkService?.queryStatus().subscribe(() => {
    updateSignalMetrics.emit();
  });

  scheduleTaskInterval(ctx, async () => updateSignalMetrics.emit(), DATADOG_IDLE_INTERVAL);

  // Networking.

  const updateConnectionMetrics = new Event().debounce(SPACE_METRICS_MIN_INTERVAL);

  updateConnectionMetrics.on(ctx, async () => {
    log('send connection metrics');
    let swarmCount = 0;
    const connectionStates = new Map<string, number>();
    for (const state in ConnectionState) {
      connectionStates.set(state, 0);
    }
    let totalReadBufferSize = 0;
    let totalWriteBufferSize = 0;
    let totalChannelBufferSize = 0;
    for (const swarm of lcsh.context.networkManager.connectionLog?.swarms ?? []) {
      swarmCount++;

      for (const conn of swarm.connections ?? []) {
        connectionStates.set(conn.state, (connectionStates.get(conn.state) ?? 0) + 1);
        totalReadBufferSize += conn.readBufferSize ?? 0;
        totalWriteBufferSize += conn.writeBufferSize ?? 0;

        for (const stream of conn.streams ?? []) {
          totalChannelBufferSize += stream.writeBufferSize ?? 0;
        }
      }
    }
    Datadog.gauge('dxos.agent.network.swarm.count', swarmCount);
    for (const state in ConnectionState) {
      Datadog.gauge('dxos.agent.network.connection.count', connectionStates.get(state) ?? 0, { state });
    }
    Datadog.gauge('dxox.agent.network.totalReadBufferSize', totalReadBufferSize);
    Datadog.gauge('dxos.agent.network.totalWriteBufferSize', totalWriteBufferSize);
    Datadog.gauge('dxos.agent.network.totalChannelBufferSize', totalChannelBufferSize);
  });

  lcsh.context.networkManager.connectionLog?.update.on(() => {
    updateConnectionMetrics.emit();
  });

  scheduleTaskInterval(ctx, async () => updateConnectionMetrics.emit(), DATADOG_IDLE_INTERVAL);
};
