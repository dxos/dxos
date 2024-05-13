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

/**
 * Currently blade-runner supports only `nodejs` and `chromium`.
 */
export type Platform = 'nodejs' | 'chromium' | 'firefox' | 'webkit';

export type ReplicantParams<S> = {
  /**
   * Replicant class name. Used in registry.
   * Sent to replicant from orchestrator process.
   */
  replicantClass: string;
  replicantId: string;
  outDir: string;
  logFile: string;
  planRunDir: string;
  redisPortSendQueue: string;
  redisPortReceiveQueue: string;

  runtime: ReplicantRuntimeParams;
  testId: string;
  spec: S;
};

export type ReplicantRuntimeParams = {
  // defaults to node.
  platform?: Platform;
};

export type PlanResults<S> = {
  replicants: { [replicantId: string]: ReplicantParams<S> };
};

// plan vs environment
export interface TestPlan<S> {
  onError?: (err: Error) => void;
  run(env: SchedulerEnv<S>, params: TestParams<S>): Promise<PlanResults<S>>;
  // TODO(mykola): Add analysesEnv which will contain collected preprocessed logs.
  analyze(params: TestParams<S>, results: PlanResults<S>): Promise<any>;
  defaultSpec(): S;
}
