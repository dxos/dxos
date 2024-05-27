//
// Copyright 2023 DXOS.org
//

import { LogLevel, createFileProcessor, log } from '@dxos/log';
import { isNode } from '@dxos/util';

import { type RunParams } from './run-process';
import { type ReplicantParams } from './spec';
import { ReplicantEnvImpl, ReplicantRegistry } from '../env';
import { DEFAULT_REDIS_OPTIONS } from '../redis';

/**
 * Entry point for process running in agent mode.
 */
export const runReplicant = async ({ replicantParams }: RunParams) => {
  try {
    initLogProcessor(replicantParams);

    const env: ReplicantEnvImpl = new ReplicantEnvImpl(replicantParams, DEFAULT_REDIS_OPTIONS);
    const replicant = new (ReplicantRegistry.instance.get(replicantParams.replicantClass))(env);

    env.setReplicant(replicant);
    await env.open();
    process.once('beforeExit', () => env.close());
  } catch (err) {
    log.catch(err, { params: replicantParams });
    finish(1);
  }
};

const initLogProcessor = (params: ReplicantParams) => {
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
