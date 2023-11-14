//
// Copyright 2023 DXOS.org
//

import { join } from 'node:path';

import { LogLevel, createFileProcessor, log } from '@dxos/log';
import { isNode } from '@dxos/util';

import { AgentEnv } from './env';
import { type TestPlan, type AgentParams, AGENT_LOG_FILE } from './spec';

/**
 * entry point for process running in agent mode
 */
export const runAgentForPlan = async <S, C>(planName: string, agentParamsJSON: string, plan: TestPlan<S, C>) => {
  const params: AgentParams<S, C> = JSON.parse(agentParamsJSON);
  await runAgent(plan, params);
};

const runAgent = async <S, C>(plan: TestPlan<S, C>, params: AgentParams<S, C>) => {
  try {
    initLogProcessor(params);

    const env = new AgentEnv<S, C>(params);
    await env.open();
    await plan.run(env);
  } catch (err) {
    log.error('agent error', { agentId: params.agentId, error: err });
    console.error(err);
    finish(1);
  } finally {
    log.info('agent complete', { agentId: params.agentId });
    finish(0);
  }
};

const initLogProcessor = <S, C>(params: AgentParams<S, C>) => {
  if (isNode()) {
    log.addProcessor(
      createFileProcessor({
        path: join(params.outDir, AGENT_LOG_FILE),
        levels: [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.TRACE],
      }),
    );
  } else {
    // NOTE: `dxgravity_log` is being exposed by playwright `.exposeFunction()` API.
    log.addProcessor((config, entry) => (window as any).dxgravity_log?.(config, entry));
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
