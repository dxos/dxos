//
// Copyright 2023 DXOS.org
//

import type * as Schema from 'effect/Schema';

import { type EchoSchema } from '@dxos/echo/internal';
import { type AnyLiveObject } from '@dxos/echo-db';
import { type Live } from '@dxos/live-object';

// TODO(burdon): Use echo-schema types.
export type TestObject = { id: string } & Record<string, any>;

export type TestSchemaMap<T extends string = string> = Record<T, EchoSchema | Schema.Schema.AnyNoContext>;

export type TestObjectProvider<T extends string = string> = (type: T) => Promise<Live<any>[]>;

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

export type TestObjectMutators = (object: AnyLiveObject<any>, params: MutationsProviderProps) => Promise<void>;
