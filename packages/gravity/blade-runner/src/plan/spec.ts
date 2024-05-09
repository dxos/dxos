//
// Copyright 2023 DXOS.org
//

import { type ReplicantEnv } from './interface';

export const AGENT_LOG_FILE = 'agent.log';

export type PlanOptions = {
  staggerAgents?: number;
  repeatAnalysis?: string;
  randomSeed?: string;
  profile?: boolean;
  debug?: boolean;
  headless?: boolean;
};

export type Platform = 'nodejs' | 'chromium' | 'firefox' | 'webkit';
export type TestParams<S> = {
  testId: string;
  outDir: string;
  spec: S;
};

export type AgentParams<S, C> = {
  agentIdx: number;
  agentId: string;
  outDir: string;
  config: C;
  planRunDir: string;
  runtime: AgentRuntimeParams;

  testId: string;
  spec: S;
  agents: Record<string, AgentRunOptions<C>>;
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
  run(env: ReplicantEnv, params: TestParams<Spec>): Promise<void>;
  runAnalyses(params: TestParams<Spec>, results: PlanResults): Promise<any>;
  defaultSpec(): Spec;
}
