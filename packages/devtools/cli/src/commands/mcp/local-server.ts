//
// Copyright 2026 DXOS.org
//

import type * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { type Client, ClientService } from '@dxos/client';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import { type Registry } from '@dxos/echo';
import { SpaceId } from '@dxos/keys';
import { McpServer } from '@dxos/mcp-server';

import { chatLayer, operationHandlers } from '../../util';

/**
 * What this host wires beneath the projected surface — echo's registry holding the operations and
 * skills, the invoke seam and session spaces (`McpServer.Host`) — plus the live client, which
 * `whoami` reads for the session's identity and the surface's own contract does not describe.
 */
export type LocalServer = {
  readonly registry: Registry.Registry;
  readonly host: McpServer.HostShape;
  readonly client: Client;
};

/**
 * The local MCP host: the operations the CLI already runs and the skills it curates, in one echo
 * registry the projection queries directly. `dx mcp serve` is the deployed server's local twin, so
 * every difference from EDGE is host-layer — no OAuth grant to narrow the session (it sees every
 * visible space), operations run in-process instead of over a service binding, and the registry is
 * the client's own hypergraph registry rather than one hydrated from an RPC
 * (`McpServer.hydrateRegistry`).
 */
export const makeLocalServer = Effect.fn(function* () {
  const client = yield* ClientService;
  const capabilities = yield* Capability.Service;
  // Captured so an invocation can erase its own requirements: the tool handlers this host backs
  // are invoked by the MCP server layer, which knows nothing of the CLI's services. The capability
  // and plugin managers ride along because operations declare them — `queryPlugins` reads what
  // this host assembled, and the space verbs reach the client through its capability.
  const ambient = yield* Effect.context<ClientService | Capability.Service | Plugin.Service>();

  // The project and task verbs arrive as capabilities like every other, because `serve` activates
  // both plugins; `operationHandlers` brings the rest the CLI curates for chat.
  const handlerSet = OperationHandlerSet.merge(
    ...capabilities.getAll(Capabilities.OperationHandler),
    operationHandlers,
  );
  const handlers = dedupeOperations(yield* handlerSet.handlers);
  const skills = dedupeByKey(capabilities.getAll(AppCapabilities.SkillDefinition));

  // The client's own hypergraph registry, not a separate instance: plugin-routine's registry-sync
  // already fills it with the capability-contributed skills and serialized operation handlers, so
  // only the directly-imported extras are added here — and only when their key is not already
  // registered, so this host never re-registers what the sync owns.
  const registry = client.graph.registry;
  const registered = (key: string) => registry.getByURI(`dxn:${normalizeKey(String(key))}`) != null;
  registry.add([
    // One non-serializable definition (importSpace's `Uint8Array`) must not take the whole
    // registry down.
    ...Operation.serializable(handlers.filter((handler) => !registered(String(handler.meta.key)))),
    // `make()` builds a detached skill whose instructions template holds its text in a
    // ref-embedded `Text` created in-process, so the target always resolves here.
    ...skills.filter((definition) => !registered(String(definition.key))).map((definition) => definition.make()),
  ]);

  // Same visibility rule as EDGE: the HALO space and the settings space hold identity and app
  // config, never user data, so neither surfaces as a space a tool may target.
  const spaceIds = client.spaces
    .get()
    .filter(AppSpace.isVisibleSpace)
    .map((space) => space.id);

  return {
    registry,
    client,

    host: {
      spaceIds,
      invoke: (request) => invoke({ handlerSet, handlers, ambient }, request),
    },
  } satisfies LocalServer;
});

/** Operation keys travel with or without the `dxn:` prefix; compare them stripped. */
const normalizeKey = (key: string): string => key.replace(/^dxn:/, '');

/** Operations reaching the merge from two sources; the first registration wins. */
const dedupeOperations = (
  handlers: readonly Operation.WithHandler<Operation.Definition.Any>[],
): Operation.WithHandler<Operation.Definition.Any>[] => {
  const seen = new Set<string>();
  return handlers.filter((handler) => {
    const key = normalizeKey(String(handler.meta.key));
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

/** A skill contributed both by an activated plugin and by direct import must project once. */
const dedupeByKey = <T extends { readonly key: unknown }>(definitions: readonly T[]): T[] => {
  const seen = new Set<string>();
  return definitions.filter((definition) => {
    const key = String(definition.key);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

type InvocationContext = {
  readonly handlerSet: OperationHandlerSet.OperationHandlerSet;
  readonly handlers: readonly Operation.WithHandler<Operation.Definition.Any>[];
  readonly ambient: Context.Context<ClientService | Capability.Service | Plugin.Service>;
};

const invoke = (
  { handlerSet, handlers, ambient }: InvocationContext,
  { key, input, spaceId }: McpServer.InvokeRequest,
): Effect.Effect<unknown, McpServer.HostError> => {
  // A named target that does not parse is an error, not a fallback: treating it as absent runs the
  // call against the session's default space, which is not the space the caller asked for.
  if (spaceId != null && !SpaceId.isValid(spaceId)) {
    return Effect.fail(McpServer.hostError(`Invalid spaceId: ${spaceId}`));
  }
  return Effect.gen(function* () {
    const handler = handlers.find((candidate) => normalizeKey(String(candidate.meta.key)) === normalizeKey(key));
    if (!handler) {
      return yield* Effect.fail(McpServer.hostError(`Operation not found: ${key}`));
    }

    const operations = yield* Operation.Service;
    // Arguments arrive in wire form (ref envelopes); decoding runs inside the space's layer so a
    // reference resolves against the database the call targets.
    const decoded = yield* Schema.decodeUnknownEffect(handler.input)(input);
    const output = yield* operations.invoke(handler, decoded);
    return McpServer.snapshot(output);
  }).pipe(
    Effect.provide(
      // The space is baked into the layer, so it is built per call rather than once per server;
      // the client caches the space itself, leaving only layer construction per invocation.
      chatLayer({ provider: 'edge', spaceId: spaceIdOption(spaceId), functions: handlerSet }),
    ),
    Effect.provideContext(ambient),
    Effect.mapError(McpServer.hostError),
    // A handler that throws dies rather than fails; surfaced as the call's error so the client
    // sees the message instead of an opaque internal-server-error.
    Effect.catchDefect((defect) => Effect.fail(McpServer.hostError(defect))),
  );
};

const spaceIdOption = (spaceId: string | undefined): Option.Option<SpaceId> =>
  spaceId != null && SpaceId.isValid(spaceId) ? Option.some(spaceId) : Option.none();
