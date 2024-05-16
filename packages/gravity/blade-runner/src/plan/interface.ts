//
// Copyright 2024 DXOS.org
//

import { type AgentParams, type AgentRuntimeParams } from './spec';

export interface CommonTestEnv {
  syncBarrier(key: string, amount: number): Promise<void>;
  syncData<T>(key: string, amount: number, data?: T): Promise<T[]>;
}

export interface ReplicantEnv extends CommonTestEnv {}

export interface SchedulerEnv<Spec> extends CommonTestEnv {
  spawn<T>(brain: ReplicantBrain<T>, runtime: AgentRuntimeParams): Promise<Replicant<T, Spec>>;
}

export type ReplicantBrain<T> = { new (): T };

export interface Replicant<T, Spec> {
  brain: RpcHandle<T>;
  kill(code?: number): void;
  params: AgentParams<Spec>;
}

export type RpcHandle<T> = {
  // todo: Events
  [K in keyof T]: T[K] extends (...args: infer A) => infer R ? (...args: A) => Promise<R> : never;
};
