//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { BaseError } from '@dxos/errors';

import * as Protocol from './Protocol.ts';

/**
 * Origin of the route; empty in the app, where the route is same-origin. A node test or script sets it to the
 * server it started.
 */
export const BaseUrl: Context.Reference<string> = Context.Reference<string>('@dxos/plugin-code-graph/BaseUrl', {
  defaultValue: () => '',
});

/** The index could not answer: no dev-server route, no index built, or the tool refused the input. */
export class CodeIndexError extends BaseError.extend('CodeIndexError', 'code-index could not answer.') {}

const decode =
  <S extends Schema.Top & { readonly DecodingServices: never }>(schema: S, what: string) =>
  (value: unknown): Effect.Effect<S['Type'], CodeIndexError> =>
    Schema.decodeUnknownEffect(schema)(value).pipe(
      Effect.mapError(
        (error) => new CodeIndexError({ message: `unexpected ${what}: ${error.message}`, context: { what } }),
      ),
    );

/**
 * Calls one code-index tool through the dev server's same-origin route.
 * The route exists only under `vite dev` (and `tauri dev`, which serves through it).
 */
export const call = Effect.fn('CodeIndexClient.call')(function* (
  tool: Protocol.Tool,
  args: Record<string, unknown> = {},
) {
  const baseUrl = yield* BaseUrl;
  const request: Protocol.Request = { tool, args };
  const response = yield* Effect.tryPromise({
    try: (signal) =>
      fetch(`${baseUrl}${Protocol.PATH}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(request),
        signal,
      }),
    catch: (error) =>
      new CodeIndexError({ message: `code-index unreachable: ${String(error)}`, context: { tool }, cause: error }),
  });
  if (response.status === 404) {
    return yield* Effect.fail(
      new CodeIndexError({
        message: `no code-index route at ${Protocol.PATH}; run Composer under \`vite dev\` with CodeIndexVitePlugin`,
        context: { tool },
      }),
    );
  }
  const json: unknown = yield* Effect.tryPromise({
    try: () => response.json(),
    catch: (error) =>
      new CodeIndexError({
        message: `unreadable code-index response: ${String(error)}`,
        context: { tool },
        cause: error,
      }),
  });
  const body = yield* decode(Protocol.Response, 'code-index response')(json);
  if (!body.ok) {
    return yield* Effect.fail(new CodeIndexError({ message: body.error, context: { tool } }));
  }
  return body.result;
});

/** A SPARQL SELECT over the index; missing `deus:` prefixes are added by the server. */
export const query = (sparql: string, limit?: number) =>
  call('query', { sparql, ...(limit !== undefined && { limit }) }).pipe(
    Effect.flatMap(decode(Protocol.QueryResult, 'query result')),
  );

/** One resource's facts; `target` is an IRI, a path, a package or symbol name. */
export const describe = (target: string, limit?: number) =>
  call('describe', { target, ...(limit !== undefined && { limit }) }).pipe(
    Effect.flatMap(decode(Protocol.DescribeResult, 'describe result')),
  );
