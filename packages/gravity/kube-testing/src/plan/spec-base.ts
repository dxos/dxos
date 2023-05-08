export type TestParams<S> = {
  testId: string
  outDir: string
  spec: S
}

export type AgentParams<S, C> = {
  agentId: string
  spec: S
  agents: Record<string, C>
  config: C
}

export interface TestPlan<S, C> {
  configurePlan(params: TestParams<S>): Promise<C[]>

  agentMain(params: AgentParams<S, C>): Promise<void>

  cleanupPlan(): Promise<void>
}