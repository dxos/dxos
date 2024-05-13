//
// Copyright 2023 DXOS.org
//

import { Context } from '@dxos/context';
import { LogLevel, createFileProcessor, log } from '@dxos/log';
import { isNode } from '@dxos/util';

import { ReplicantEnvImpl, ReplicantRegistry, type RedisOptions } from './env';
import { WebSocketConnector } from './env/websocket-connector';
import { DEFAULT_WEBSOCKET_ADDRESS } from './env/websocket-redis-proxy';
import { type RunParams } from './run-process';
import { type ReplicantParams } from './spec';
import { RESOURCE_USAGE_LOG, type ResourceUsageLogEntry } from '../analysys/resource-usage';

/**
 * Entry point for process running in agent mode.
 */
export const runReplicant = async <S>({ agentParams: params, options }: RunParams<S>) => {
  const ctx = new Context();
  try {
    initLogProcessor(params);
    const replicant = new (ReplicantRegistry.instance.get(params.replicantClass))();

    const env = new ReplicantEnvImpl<S>(
      replicant,
      params,
      !isNode() ? ({ Connector: WebSocketConnector, address: DEFAULT_WEBSOCKET_ADDRESS } as RedisOptions) : undefined,
    );
    await env.open();
    ctx.onDispose(() => env.close());
    process.once('beforeExit', () => env.close());
  } catch (err) {
    log.catch(err, { replicantId: params.replicantId });
    finish(1);
  }
};

const initLogProcessor = <S>(params: ReplicantParams<S>) => {
  if (isNode()) {
    log.addProcessor(
      createFileProcessor({
        pathOrFd: params.logFile,
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
  // TODO(mykola): track diagnostics in browser.
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
