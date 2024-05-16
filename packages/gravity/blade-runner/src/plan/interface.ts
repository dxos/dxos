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
  spawn<T>(brain: ReplicantBrain<T>, runtime: ReplicantRuntimeParams): Promise<Replicant<T>>;
}

export type ReplicantBrain<T> = { new (replicantEnv: () => ReplicantEnv): T };

export interface Replicant<T> {
  brain: RpcHandle<T>;
  kill(signal?: NodeJS.Signals | number): void;
  params: ReplicantParams;
}

export type RpcHandle<T> = {
  // todo: Events
  [K in keyof T]: T[K] extends (...args: infer A) => infer R ? (...args: A) => Promise<R> : never;
};
