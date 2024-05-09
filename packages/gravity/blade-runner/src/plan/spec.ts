//
// Copyright 2023 DXOS.org
//

import { type SchedulerEnv } from './interface';

export const AGENT_LOG_FILE = 'agent.log';

export type GlobalOptions = {
  staggerAgents?: number;
  repeatAnalysis?: string;
  randomSeed?: string;
  profile?: boolean;
  debug?: boolean;
  headless?: boolean;
};

export type TestParams<S> = {
  testId: string;
  outDir: string;
  spec: S;
};

export type Platform = 'nodejs' | 'chromium' | 'firefox' | 'webkit';

// TODO(mykola): Remove.
export type AgentParams<S, C> = {
  /**
   * Replicant name. Used in registry.
   */
  name: string;
  agentIdx: number;
  agentId: string;
  outDir: string;
  config: C;
  planRunDir: string;
  runtime: AgentRuntimeParams;
  redisPortSendQueue: string;
  redisPortReceiveQueue: string;

  testId: string;
  spec: S;
};

export type AgentRuntimeParams = {
  // defaults to node.
  platform?: Platform;
};

export type AgentRunOptions<C> = {
  config: C;
  runtime?: AgentRuntimeParams;
};

export type PlanResults = {
  agents: { [agentId: string]: AgentResult };
};

export type AgentResult = {
  result: number;
  outDir: string;
  logFile: string;
  startTs?: number;
  endTs?: number;
};

// plan vs environment
export interface TestPlan<Spec> {
  onError?: (err: Error) => void;
  run(env: SchedulerEnv, params: TestParams<Spec>): Promise<void>;
  analyses(params: TestParams<Spec>, results: PlanResults): Promise<any>;
  defaultSpec(): Spec;
}
