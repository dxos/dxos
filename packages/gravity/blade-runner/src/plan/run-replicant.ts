//
// Copyright 2023 DXOS.org
//

import { join } from 'node:path';

import { Context } from '@dxos/context';
import { LogLevel, createFileProcessor, log } from '@dxos/log';
import { isNode } from '@dxos/util';

import { ReplicantEnvImpl, type RedisOptions } from './env';
import { ReplicantRegistry } from './env/replicant-registry';
import { WebSocketConnector } from './env/websocket-connector';
import { DEFAULT_WEBSOCKET_ADDRESS } from './env/websocket-redis-proxy';
import { type RunParams } from './run-process';
import { type AgentParams, AGENT_LOG_FILE } from './spec';
import { RESOURCE_USAGE_LOG, type ResourceUsageLogEntry } from '../analysys/resource-usage';

/**
 * Entry point for process running in agent mode.
 */
export const runReplicant = async (params: RunParams) => {
  const replicant = new (ReplicantRegistry.instance.get(params.replicantParams.name))();
  // eslint-disable-next-line unused-imports/no-unused-vars
  const replicantEnv = new ReplicantEnvImpl(replicant);
};

const runReplicant = async <S, C>(params: AgentParams<S, C>) => {
  const ctx = new Context();
  try {
    initLogProcessor(params);

    const env = new ReplicantEnvImpl<S, C>(
      params,
      !isNode() ? ({ Connector: WebSocketConnector, address: DEFAULT_WEBSOCKET_ADDRESS } as RedisOptions) : undefined,
    );
    initDiagnostics();
    await env.open();
    ctx.onDispose(() => env.close());
  } catch (err) {
    log.catch(err, { agentId: params.agentId });
    finish(1);
  } finally {
    log.info('agent complete', { agentId: params.agentId });
    void ctx.dispose();
    finish(0);
  }
};

const initLogProcessor = <S, C>(params: AgentParams<S, C>) => {
  if (isNode()) {
    log.addProcessor(
      createFileProcessor({
        pathOrFd: join(params.outDir, AGENT_LOG_FILE),
        levels: [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.TRACE],
      }),
    );
  } else {
    // NOTE: `dxgravity_log` is being exposed by playwright `.exposeFunction()` API. Log chattiness can cause playwright connection overload so we limit it to only trace logs and info and above.
    log.addProcessor((config, entry) => {
      if (entry.level === LogLevel.TRACE || entry.level >= LogLevel.INFO) {
        (window as any).dxgravity_log?.(config, entry);
      }
    });
  }
};

const finish = (code: number) => {
  if (isNode()) {
    process.exit(code);
  } else {
    // NOTE: `dxgravity_done` is being exposed by playwright `.exposeFunction()` API.
    (window as any).dxgravity_done?.(code);
  }
};

const initDiagnostics = () => {
  if (isNode()) {
    let prevCpuUsage = process.cpuUsage();

    log.trace(RESOURCE_USAGE_LOG, {
      ts: performance.now(),
    });

    setInterval(() => {
      const cpuUsage = process.cpuUsage(prevCpuUsage);
      prevCpuUsage = process.cpuUsage();

      const memoryUsage = process.memoryUsage();

      log.trace(RESOURCE_USAGE_LOG, {
        ts: performance.now(),
        cpu: cpuUsage,
        memory: memoryUsage,
      } satisfies ResourceUsageLogEntry);
    }, 200);
  }
};
