//
// Copyright 2024 DXOS.org
//

import { type ReplicantBrain, type ReplicantClass, type ReplicantParams, type ReplicantRuntimeParams } from '../plan';

// TODO(mykola): R with `spec.ts`
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
 * Extracts all methods from T and makes them async.
 */
export type RpcHandle<T> = {
  // todo: Events
  [K in keyof T]: T[K] extends (...args: infer A) => infer R ? (...args: A) => Promise<R> : never;
};
