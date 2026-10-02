//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as McpProtocol from 'effect/unstable/ai/McpProtocol';
import * as McpServer$ from 'effect/unstable/ai/McpServer';
import * as Tool from 'effect/unstable/ai/Tool';
import * as HttpRouter from 'effect/unstable/http/HttpRouter';

import { DXOS_VERSION } from '@dxos/client';
import type * as Operation from '@dxos/compute/Operation';
import { Database, Registry } from '@dxos/echo';
import { EID, SpaceId } from '@dxos/keys';
import { McpServer } from '@dxos/mcp-server';

/** The name an agent knows Composer's MCP server by. */
export const SERVER_NAME = 'composer';

/** The server's tools that only read. */
export const READ_ONLY_TOOLS: readonly string[] = Object.values(McpServer.ServerToolkit.tools)
  .filter((tool) => Context.get(tool.annotations, Tool.Readonly))
  .map((tool) => tool.name);

export type HostOptions = {
  /** Every operation the app can run, by the handler that runs it. */
  handlers: Effect.Effect<readonly Operation.WithHandler<Operation.Definition.Any>[]>;
  /** Runs an operation the way the app does, against `spaceId`. */
  invoke: (operation: Operation.Definition.Any, input: unknown, spaceId: SpaceId | undefined) => Effect.Effect<unknown>;
  /** The only spaces the agent may address: the chat's. */
  spaceIds: readonly SpaceId[];
  /** The database of a space, which references in an operation's input resolve against. */
  database: (spaceId: SpaceId) => Database.Database | undefined;
};

/**
 * The MCP host over the app's own operations, the page's counterpart to `dx mcp serve`: an operation
 * named by key is decoded against its live schema and run through the app's invoker.
 */
export const host = ({ handlers, invoke, spaceIds, database }: HostOptions): McpServer.HostShape => ({
  spaceIds,
  invoke: ({ key, input, spaceId }) =>
    Effect.gen(function* () {
      if (spaceId != null && !SpaceId.isValid(spaceId)) {
        return yield* Effect.fail(McpServer.hostError(`Invalid spaceId: ${spaceId}`));
      }
      const handler = (yield* handlers).find(
        (candidate) => normalizeKey(String(candidate.meta.key)) === normalizeKey(key),
      );
      if (!handler) {
        return yield* Effect.fail(McpServer.hostError(`Operation not found: ${key}`));
      }
      // References resolve through the target space's database, which can read other open spaces' objects, so
      // the input may name no space but that one.
      const foreign = referencedSpaces(input).find((referenced) => referenced !== spaceId);
      if (foreign !== undefined) {
        return yield* Effect.fail(McpServer.hostError(`The input references another space: ${foreign}`));
      }
      // Arguments arrive in wire form; a reference among them decodes to a ref in the target space.
      const decode = Schema.decodeUnknownEffect(handler.input)(input);
      const db = spaceId ? database(spaceId) : undefined;
      const decoded = yield* (db ? decode.pipe(Effect.provide(Database.layer(db))) : decode).pipe(
        Effect.mapError(McpServer.hostError),
      );
      return McpServer.snapshot(yield* invoke(handler, decoded, spaceId ?? undefined));
    }).pipe(Effect.catchDefect((defect) => Effect.fail(McpServer.hostError(defect)))),
});

export type HandlerOptions = {
  registry: Registry.Registry;
  host: McpServer.HostShape;
  /** The path the server answers on, which is where the helper relays its requests. */
  path: `/${string}`;
};

/**
 * Composer's MCP surface (discovery, dispatch and skill loading over the registry) as a fetch
 * handler, with the same response passes every host applies.
 */
export const handler = ({ registry, host, path }: HandlerOptions) => {
  const web = HttpRouter.toWebHandler(
    McpServer.layer().pipe(
      Layer.provide(Layer.mergeAll(Layer.succeed(Registry.Service, registry), Layer.succeed(McpServer.Host, host))),
      Layer.provide(
        McpServer$.layerHttp({
          name: McpServer.identity.name,
          version: DXOS_VERSION,
          path,
          // As `dx mcp serve`: a request naming no version falls back to the first adapter.
          protocols: [McpProtocol.v2025_06_18, McpProtocol.v2026_07_28],
        }),
      ),
    ),
  );
  return {
    handle: async (request: Request): Promise<Response> =>
      // The relay answers a request once, whole; a subscription's stream never ends, so it is declined.
      request.headers.get('mcp-method') === 'subscriptions/listen'
        ? declineSubscription(request)
        : McpServer.normalizeResponse(await web.handler(request), { request }),
    dispose: web.dispose,
  };
};

const RequestId = Schema.fromJsonString(Schema.Struct({ id: Schema.Union([Schema.String, Schema.Number]) }));

/** A JSON-RPC error rather than an HTTP one, which a client reads as its session being gone. */
const declineSubscription = async (request: Request): Promise<Response> => {
  const body = Schema.decodeUnknownOption(RequestId)(await request.text());
  return Response.json({
    jsonrpc: '2.0',
    id: Option.isSome(body) ? body.value.id : null,
    error: { code: -32601, message: 'Subscriptions are not supported by this server.' },
  });
};

/** The spaces named by the reference envelopes (`{ "/": <uri> }`) anywhere in a wire-form value. */
const referencedSpaces = (value: unknown, seen = new Set<unknown>()): SpaceId[] => {
  if (value === null || typeof value !== 'object' || seen.has(value)) {
    return [];
  }
  seen.add(value);
  const entries = Array.isArray(value) ? value : Object.values(value);
  const uri = !Array.isArray(value) && '/' in value && entries.length === 1 ? value['/'] : undefined;
  if (typeof uri === 'string') {
    const eid = EID.tryParse(uri);
    const space = eid && EID.getSpaceId(eid);
    return space ? [space] : [];
  }
  return entries.flatMap((entry) => referencedSpaces(entry, seen));
};

/** Operation keys travel with or without the `dxn:` prefix. */
const normalizeKey = (key: string): string => key.replace(/^dxn:/, '');
