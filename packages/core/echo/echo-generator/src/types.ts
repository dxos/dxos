//
// Copyright 2023 DXOS.org
//

import { type Obj, type Type } from '@dxos/echo';

// TODO(burdon): Use echo-schema types.
export type TestObject = { id: string } & Record<string, any>;

export type TestSchemaMap<T extends string = string> = Record<T, Type.Obj.Any>;

export type TestObjectProvider<T extends string = string> = (type: T) => Promise<any[]>;

export type TestGeneratorMap<T extends string = string> = Record<
  T,
  (provider: TestObjectProvider<T> | undefined) => any
>;

export type TestMutationsMap<T extends string = string> = Record<T, TestObjectMutators>;

export type MutationsProviderProps = {
  count: number;
  mutationSize: number;
  maxContentLength: number;
};

export type TestObjectMutators = (object: Obj.Any, params: MutationsProviderProps) => Promise<void>;
