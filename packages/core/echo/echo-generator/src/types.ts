//
// Copyright 2023 DXOS.org
//

import { type Schema, type Expando } from '@dxos/client/echo';

export type TestObject = { id: string } & Record<string, any>;

export type TestSchemaMap<T extends string> = Record<T, Schema>;

export type TestGeneratorMap<T extends string> = Record<T, (provider: TestObjectProvider<T> | undefined) => any>;

export type TestObjectProvider<T extends string> = (type: T) => Expando[];
