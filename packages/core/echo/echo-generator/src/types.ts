//
// Copyright 2023 DXOS.org
//

import { type ReactiveEchoObject } from '@dxos/echo-db';
import { type MutableSchema, type S } from '@dxos/echo-schema';
import { type ReactiveObject } from '@dxos/live-object';

// TODO(burdon): Use echo-schema types.
export type TestObject = { id: string } & Record<string, any>;

export type TestSchemaMap<T extends string = string> = Record<T, MutableSchema | S.Schema<any>>;

export type TestObjectProvider<T extends string = string> = (type: T) => Promise<ReactiveObject<any>[]>;

export type TestGeneratorMap<T extends string = string> = Record<
  T,
  (provider: TestObjectProvider<T> | undefined) => any
>;

export type TestMutationsMap<T extends string = string> = Record<T, TestObjectMutators>;

export type MutationsProviderParams = {
  count: number;
  mutationSize: number;
  maxContentLength: number;
};

export type TestObjectMutators = (object: ReactiveEchoObject<any>, params: MutationsProviderParams) => Promise<void>;
