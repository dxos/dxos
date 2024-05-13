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

/**
 * Currently blade-runner supports only `nodejs` and `chromium`.
 */
export type Platform = 'nodejs' | 'chromium' | 'firefox' | 'webkit';

export type ReplicantParams<Spec> = {
  /**
   * Replicant class name. Used in registry.
   * Sent to replicant from orchestrator process.
   */
  replicantClass: string;
  replicantId: string;
  outDir: string;
  planRunDir: string;
  redisPortSendQueue: string;
  redisPortReceiveQueue: string;

  runtime: ReplicantRuntimeParams;
  testId: string;
  spec: Spec;
};

export type ReplicantRuntimeParams = {
  // defaults to node.
  platform?: Platform;
};

export type PlanResults<Spec> = {
  replicants: { [replicantId: string]: ReplicantParams<Spec> };
};

// plan vs environment
export interface TestPlan<Spec> {
  onError?: (err: Error) => void;
  run(env: SchedulerEnv<Spec>, params: TestParams<Spec>): Promise<PlanResults<Spec>>;
  // TODO(mykola): Add analysesEnv which will contain collected preprocessed logs.
  analyze(params: TestParams<Spec>, results: PlanResults<Spec>): Promise<any>;
  defaultSpec(): Spec;
}
