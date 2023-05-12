//
// Copyright 2023 DXOS.org
//

export type TestParams<S> = {
  testId: string;
  outDir: string;
  spec: S;
};

export type AgentParams<S, C> = {
  agentCounter: number;
  agentId: string;
  outDir: string;
  config: C;

  // environment: {
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

  run(params: AgentParams<S, C>): Promise<void>; // N

  finish(params: TestParams<S>, results: PlanResults): Promise<any>;
}
