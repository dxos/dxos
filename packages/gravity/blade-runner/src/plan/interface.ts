//
// Copyright 2024 DXOS.org
//

import { type ReplicantParams, type ReplicantRuntimeParams } from './spec';

export interface CommonTestEnv {
  syncBarrier(key: string, amount: number): Promise<void>;
  syncData<T>(key: string, amount: number, data?: T): Promise<T[]>;
}

export interface ReplicantEnv extends CommonTestEnv {}

export interface SchedulerEnv<S> extends CommonTestEnv {
  spawn<T>(brain: ReplicantBrain<T>, runtime: ReplicantRuntimeParams): Promise<Replicant<T, S>>;
}

export type ReplicantBrain<T> = { new (): T };

export interface Replicant<T, S> {
  brain: RpcHandle<T>;
  kill(signal?: NodeJS.Signals | number): void;
  params: ReplicantParams<S>;
}

export type RpcHandle<T> = {
  // todo: Events
  [K in keyof T]: T[K] extends (...args: infer A) => infer R ? (...args: A) => Promise<R> : never;
};
