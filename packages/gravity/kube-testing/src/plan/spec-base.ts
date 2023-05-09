//
// Copyright 2023 DXOS.org
//

export type TestParams<S> = {
  testId: string;
  outDir: string;
  spec: S;
};

export type AgentParams<S, C> = {
  agentId: string;
  spec: S;
  agents: Record<string, C>;
  outDir: string;
  config: C;
};

export type PlanResults = {
  agents: { [agentId: string]: AgentResult }
}

export type AgentResult = {
  exitCode: number
  outDir: string
  logFile: string
}

export interface TestPlan<S, C> {
  configurePlan(params: TestParams<S>): Promise<C[]>; // 1

  agentMain(params: AgentParams<S, C>): Promise<void>; // N

  finishPlan(results: PlanResults): Promise<void>;
}
