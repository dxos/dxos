//
// Copyright 2023 DXOS.org
//

import { type ReplicantEnv, type RpcHandle, type SchedulerEnv } from '../env';

export const AGENT_LOG_FILE = 'agent.log';

/**
 * Replicant class.
 */
export type ReplicantClass<T> = { new (replicantEnv: ReplicantEnv): T };

/**
 * RPC handle to a replicant that is running in a separate process or browser.
 */
export interface ReplicantBrain<T> {
  /**
   * Field that holds the RPC handle to the replicant.
   */
  brain: RpcHandle<T>;
  params: ReplicantProps;
  kill(signal?: NodeJS.Signals | number): void;
}

export type GlobalOptions = {
  repeatAnalysis?: string;
  randomSeed?: string;
  profile?: boolean;
  debug?: boolean;
  headless?: boolean;
  shouldBuildBrowser?: boolean;
};

export type TestProps<S> = {
  testId: string;
  outDir: string;
  spec: S;
};

/**
 * Currently blade-runner supports only `nodejs` and `chromium`.
 */
export type Platform = 'nodejs' | 'chromium' | 'firefox' | 'webkit';

export type ReplicantProps = {
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

  /**
   * Queue for serialized JSON perfetto traces.
   * Used to pipe through the perfetto events from the replicant to the orchestrator.
   */
  redisTracingQueue: string;

  runtime: ReplicantRuntimeProps;
  testId: string;
};

export type ReplicantRuntimeProps = {
  // defaults to node.
  platform?: Platform;

  /**
   * Path to a browser context.
   */
  userDataDir?: string;
};

export type ReplicantsSummary = { [replicantId: string]: ReplicantProps };

// plan vs environment
export interface TestPlan<S, R = void> {
  onError?: (err: Error) => void;
  defaultSpec(): S;
  /**
   * Run the test.
   * @returns results of the run will be passed to the `analyze` method.
   */
  run(env: SchedulerEnv, params: TestProps<S>): Promise<R>;
  // TODO(mykola): Add analysesEnv which will contain collected preprocessed logs.
  analyze?: (params: TestProps<S>, summary: ReplicantsSummary, result: R) => Promise<any>;
}
