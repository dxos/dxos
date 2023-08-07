//
// Copyright 2023 DXOS.org
//

import { AgentEnv } from './agent-env';

export type Platform = "nodejs" | "chromium" | "firefox" | "webkit"

export type TestParams<S> = {
  testId: string;
  outDir: string;
  spec: S;
};

export type AgentParams<S, C> = {
  agentIdx: number;
  agentId: string;
  outDir: string;
  planRunDir: string;
  runtime: AgentRuntimeParams,
  config: C;

  // environment: {
  testId: string;
  spec: S;
  agents: Record<string, AgentRunOptions<C>>;
  // }
};

export type AgentRuntimeParams = {
  // defaults to node.
  platform?: Platform
}

export type AgentRunOptions<C> = {
  config: C;
  runtime?: AgentRuntimeParams
}

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
  init(params: TestParams<S>): Promise<AgentRunOptions<C>[]>; // 1

  run(env: AgentEnv<S, C>): Promise<void>; // N

  finish(params: TestParams<S>, results: PlanResults): Promise<any>;
}
