//
// Copyright 2023 DXOS.org
//

import { join } from 'node:path';

import { LogLevel, createFileProcessor, log } from '@dxos/log';

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
    log.addProcessor(
      createFileProcessor({
        path: join(params.outDir, AGENT_LOG_FILE),
        levels: [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.TRACE],
      }),
    );

    const env = new AgentEnv<S, C>(params);
    await env.open();
    await plan.run(env);
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    log.info('agent complete', { agentId: params.agentId });
    process.exit(0);
  }
};
