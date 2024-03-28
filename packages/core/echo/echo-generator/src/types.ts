//
// Copyright 2023 DXOS.org
//

import { type DynamicEchoSchema, type ReactiveObject } from '@dxos/echo-schema';

export type TestObject = { id: string } & Record<string, any>;

export type TestSchemaMap<T extends string> = Record<T, DynamicEchoSchema>;

export type TestGeneratorMap<T extends string> = Record<T, (provider: TestObjectProvider<T> | undefined) => any>;

export type TestObjectProvider<T extends string> = (type: T) => ReactiveObject<any>[];
