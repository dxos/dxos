//
// Copyright 2023 DXOS.org
//

import { type SchedulerEnv } from './interface';

export const AGENT_LOG_FILE = 'agent.log';

export type GlobalOptions = {
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

export type ReplicantParams = {
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
};

export type ReplicantRuntimeParams = {
  // defaults to node.
  platform?: Platform;

  /**
   * Path to a browser context.
   */
  userDataDir?: string;
};

export type ReplicantsSummary = { [replicantId: string]: ReplicantParams };

// plan vs environment
export interface TestPlan<S, R = void> {
  onError?: (err: Error) => void;
  /**
   * Run the test.
   * @returns results of the run will be passed to the `analyze` method.
   */
  run(env: SchedulerEnv, params: TestParams<S>): Promise<R>;
  // TODO(mykola): Add analysesEnv which will contain collected preprocessed logs.
  analyze(params: TestParams<S>, summary: ReplicantsSummary, result: R): Promise<any>;
  defaultSpec(): S;
}
