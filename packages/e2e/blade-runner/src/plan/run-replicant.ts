//
// Copyright 2023 DXOS.org
//

import { LogLevel, createFileProcessor, log } from '@dxos/log';
import { isNode } from '@dxos/util';

import { ReplicantEnvImpl, ReplicantRegistry } from '../env';
import { DEFAULT_REDIS_OPTIONS } from '../redis';

import { type RunProps } from './run-process';
import { type ReplicantProps } from './spec';

/**
 * Entry point for process running in agent mode.
 */
export const runReplicant = async ({ replicantProps }: RunProps) => {
  try {
    initLogProcessor(replicantProps);
    log.info('running replicant', { params: replicantProps });

    process.on('SIGINT', () => finish('SIGINT'));
    process.on('SIGTERM', () => finish('SIGTERM'));

    const env: ReplicantEnvImpl = new ReplicantEnvImpl(replicantProps, DEFAULT_REDIS_OPTIONS);
    const replicant = new (ReplicantRegistry.instance.get(replicantProps.replicantClass))(env);

    env.setReplicant(replicant);
    await env.open();
    process.once('beforeExit', () => env.close());
    // Ensure graceful termination so Node writes CPU profile when enabled.
  } catch (err) {
    log.catch(err, { params: replicantProps });
    finish(1);
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

const finish = (code: number | string) => {
  if (isNode()) {
    process.exit(code);
  } else {
    // NOTE: `dx_runner_done` is being exposed by playwright `.exposeFunction()` API.
    (window as any).dx_runner_done?.(code);
  }
};
