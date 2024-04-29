//
// Copyright 2024 DXOS.org
//

import { type Context } from 'hono';

import { next as A } from '@dxos/automerge/automerge';

import { safeJson } from '../util';

// TODO(burdon): Simple query manager.
export type SerializedObject = {
  id: string;
  schema: string;
  changes: Uint8Array;
};

// TODO(burdon): Replace with ECHO object.
export type EchoObject<T = {}> = {
  id: string;
  schema: string;
  object: T;
};

export type Input = {
  objects?: SerializedObject[];
};

export type Output = {
  objects?: SerializedObject[];
};

// TODO(burdon): Pass in database?
export type Transform<Input = any, Output = any> = (
  objects: EchoObject<Input>[],
) => Promise<EchoObject<Output>[] | void>;

// TODO(burdon): Standardize POST API (event, state).
//  https://effect.website/docs/guides/essentials/pipeline
//  https://developers.cloudflare.com/reference-architecture/diagrams/serverless/serverless-etl/
//  Queue, Worker, Storage, AI, RAG, Fetcher.
// export type FunctionEvent<T extends {}> = {
//   debug?: boolean;
//   data?: T;
// };

/**
 * Http Post method wrapper.
 */
export const handlePost = (fn: Transform) => {
  const mapper = execFunction(fn);
  return async (c: Context) => {
    const input = await safeJson<Input>(c.req, {});
    const output = await mapper(input);
    return c.json<Output>(output);
  };
};

/**
 * Serializes and deserializes objects for function invocation.
 */
export const execFunction =
  (fn: Transform) =>
  async (input: Input): Promise<Output> => {
    const objects: EchoObject[] =
      input.objects?.map(({ id, schema, changes }) => ({ id, schema, object: A.load<unknown>(changes) })) ?? [];
    const mutated = await fn(objects);
    return {
      objects: mutated?.map(({ id, schema, object }) => ({ id, schema, changes: A.save(object) })),
    };
  };
