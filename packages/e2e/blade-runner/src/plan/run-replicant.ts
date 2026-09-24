//
// Copyright 2023 DXOS.org
//

import { LogLevel, log } from '@dxos/log';
import { createFileProcessor } from '@dxos/log/file-processor';
import { isNode } from '@dxos/util';

import { ReplicantEnvImpl, ReplicantRegistry } from '../env/index.ts';
import { DEFAULT_REDIS_OPTIONS } from '../redis/index.ts';
import { flushSpanExport, startSpanExport } from '../tracing/index.ts';
import { type RunProps } from './run-process.ts';
import { type ReplicantProps } from './spec.ts';

/**
 * Entry point for process running in agent mode.
 */
export const runReplicant = async ({ replicantProps }: RunProps) => {
  try {
    initLogProcessor(replicantProps);
    log.info('running replicant', { params: replicantProps });

    // The conventional codes for the signals: `process.exit` throws on a signal name.
    process.on('SIGINT', () => void finish(130));
    process.on('SIGTERM', () => void finish(143));
    if (isNode()) {
      await startSpanExport();
    }

    const env: ReplicantEnvImpl = new ReplicantEnvImpl(replicantProps, DEFAULT_REDIS_OPTIONS);
    const replicant = new (ReplicantRegistry.instance.get(replicantProps.replicantClass))(env);

    env.setReplicant(replicant);
    await env.open();
    process.once('beforeExit', () => env.close());
    // Ensure graceful termination so Node writes CPU profile when enabled.
  } catch (err) {
    log.catch(err, { params: replicantProps });
    await finish(1);
  }
};

const initLogProcessor = (params: ReplicantProps) => {
  if (isNode()) {
    log.addProcessor(
      createFileProcessor({
        pathOrFd: params.logFile,
        levels: [LogLevel.ERROR, LogLevel.WARN, LogLevel.VERBOSE, LogLevel.INFO, LogLevel.TRACE],
      }),
    );
  } else {
    // NOTE: `dx_runner_log` is being exposed by playwright `.exposeFunction()` API.
    // CAUTION: Log chattiness can cause playwright connection overload so we limit it to only trace logs and verbose and above.
    log.addProcessor((config, entry) => {
      if (entry.level === LogLevel.TRACE || entry.level >= LogLevel.INFO) {
        (window as any).dx_runner_log?.(config, entry);
      }
    });
  }
};

const finish = async (code: number) => {
  if (isNode()) {
    // The orchestrator ends a run by killing its replicants, which would drop the last batch of spans.
    await flushSpanExport();
    process.exit(code);
  } else {
    // NOTE: `dx_runner_done` is being exposed by playwright `.exposeFunction()` API.
    (window as any).dx_runner_done?.(code);
  }
};
