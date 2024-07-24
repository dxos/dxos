//
// Copyright 2023 DXOS.org
//

import { type EchoReactiveObject, type DynamicSchema, type ReactiveObject } from '@dxos/echo-schema';

export type TestObject = { id: string } & Record<string, any>;

export type TestSchemaMap<T extends string> = Record<T, DynamicSchema>;

export type TestGeneratorMap<T extends string> = Record<T, (provider: TestObjectProvider<T> | undefined) => any>;

export type TestObjectProvider<T extends string> = (type: T) => Promise<ReactiveObject<any>[]>;

export type TestMutationsMap<T extends string> = Record<T, TestObjectMutators>;

export type MutationsProviderParams = {
  count: number;
  mutationSize: number;
  maxContentLength: number;
};

export type TestObjectMutators = (object: EchoReactiveObject<any>, params: MutationsProviderParams) => void;
