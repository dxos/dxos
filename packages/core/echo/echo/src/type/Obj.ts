//
// Copyright 2025 DXOS.org
//

import { type AnyLiveObject as AnyLiveObject$ } from '@dxos/echo-db';
import { type BaseEchoObject, type BaseObject, getSchema as getSchema$ } from '@dxos/echo-schema';
import { live as live$ } from '@dxos/live-object';

// TODO(burdon): Remove from Type?

export declare namespace Obj {
  export type Any = BaseEchoObject;
  export type Live<T extends BaseObject> = AnyLiveObject$<T>;
}

export const create = live$;

export const getSchema = getSchema$;
