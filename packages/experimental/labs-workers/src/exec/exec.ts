//
// Copyright 2024 DXOS.org
//

import { type Context } from 'hono';

import { safeJson } from '../util';

// TODO(burdon): Simple query manager.
export type SerializedObject = {
  id: string;
  schema: string;
  changes: Uint8Array;
};

export type Input = {
  objects?: SerializedObject[];
};

export type Output = {
  objects?: SerializedObject[];
};

export type Function = (input: Input) => Promise<Output | void>;

/**
 *
 */
export const postHandler = (fn: Function) => async (c: Context) => {
  const input = await safeJson<Input>(c.req);
  const output = await fn(input);
  return c.json<Output>(output ?? {});
};
