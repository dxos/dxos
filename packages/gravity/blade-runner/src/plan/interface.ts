//
// Copyright 2024 DXOS.org
//

import { type ReplicantParams, type ReplicantRuntimeParams } from './spec';

export interface CommonTestEnv {
  syncBarrier(key: string, amount: number): Promise<void>;
  syncData<T>(key: string, amount: number, data?: T): Promise<T[]>;
}

export interface ReplicantEnv extends CommonTestEnv {
  params: ReplicantParams;
}

export interface SchedulerEnv extends CommonTestEnv {
  spawn<T>(replicantClass: ReplicantClass<T>, runtime: ReplicantRuntimeParams): Promise<ReplicantBrain<T>>;
}

/**
 * Replicant class.
 */
export type ReplicantClass<T> = { new (replicantEnv: () => ReplicantEnv): T };

/**
 * RPC handle to a replicant that is running in a separate process or browser.
 */
export interface ReplicantBrain<T> {
  /**
   * Field that holds the RPC handle to the replicant.
   */
  brain: RpcHandle<T>;
  kill(signal?: NodeJS.Signals | number): void;
  params: ReplicantParams;
}

export type RpcHandle<T> = {
  // todo: Events
  [K in keyof T]: T[K] extends (...args: infer A) => infer R ? (...args: A) => Promise<R> : never;
};
