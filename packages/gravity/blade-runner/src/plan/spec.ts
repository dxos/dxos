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

export type TestParams<Spec> = {
  testId: string;
  outDir: string;
  spec: Spec;
};

export type Platform = 'nodejs' | 'chromium' | 'firefox' | 'webkit';

// TODO(mykola): Rename to ReplicantParams.
export type AgentParams<Spec> = {
  /**
   * Replicant class name. Used in registry.
   * Sent to replicant from orchestrator process.
   */
  // TODO(mykola): Rename to replicantClass.
  name: string;
  // TODO(mykola): Delete agentIdx.
  agentIdx: number;
  // TODO(mykola): Rename to ReplicantId.
  agentId: string;
  outDir: string;
  planRunDir: string;
  redisPortSendQueue: string;
  redisPortReceiveQueue: string;

  runtime: AgentRuntimeParams;
  testId: string;
  spec: Spec;
};

// TODO(mykola): Rename to ReplicantRuntimeParams.
export type AgentRuntimeParams = {
  // defaults to node.
  platform?: Platform;
};

// TODO(mykola): Rename to ReplicantRunOptions.
export type AgentRunOptions<C> = {
  // TODO(nykola): Delete config.
  config: C;
  runtime?: AgentRuntimeParams;
};

export type PlanResults = {
  agents: { [agentId: string]: AgentLog };
};

export type AgentLog = {
  outDir: string;
  logFile: string;
};

// plan vs environment
export interface TestPlan<Spec> {
  onError?: (err: Error) => void;
  run(env: SchedulerEnv<Spec>, params: TestParams<Spec>): Promise<PlanResults>;
  // TODO(mykola): Add analysesEnv which will contain collected preprocessed logs.
  analyze(params: TestParams<Spec>, results: PlanResults): Promise<any>;
  defaultSpec(): Spec;
}
