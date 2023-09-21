//
// Copyright 2023 DXOS.org
//

import { AgentEnv } from './env';

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

  // environment: {
  testId: string;
  spec: S;
  agents: Record<string, C>;
  // }
};

export type PlanResults = {
  agents: { [agentId: string]: AgentResult };
};

export type AgentResult = {
  exitCode: number;
  outDir: string;
  logFile: string;
};

// plan vs environment
export interface TestPlan<S, C> {
  init(params: TestParams<S>): Promise<C[]>; // 1
  run(env: AgentEnv<S, C>): Promise<void>; // N
  finish(params: TestParams<S>, results: PlanResults): Promise<any>;
  defaultSpec(): S;
}
