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

export interface TestPlan<S, C> {
  configurePlan(params: TestParams<S>): Promise<C[]>; // 1

  agentMain(params: AgentParams<S, C>): Promise<void>; // N

  cleanupPlan(): Promise<void>;
}
