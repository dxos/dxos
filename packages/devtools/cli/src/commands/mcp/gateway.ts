//
// Copyright 2026 DXOS.org
//

import type * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { type Client, ClientService } from '@dxos/client';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Skill from '@dxos/compute/Skill';
import { Obj, Type } from '@dxos/echo';
import { SpaceId } from '@dxos/keys';
import { Gateway } from '@dxos/mcp-server';
import * as CodeProjectSkill from '@dxos/plugin-projects/CodeProjectSkill';
// Narrow subpath imports: these plugins declare React surfaces, and a bundler follows the dynamic
// import behind a lazy capability, so activating them would pull React into the CLI binary.
import * as ProjectOperationHandlerSet from '@dxos/plugin-projects/ProjectOperationHandlerSet';
import * as TasksOperationHandlerSet from '@dxos/plugin-tasks/TasksOperationHandlerSet';

import { chatLayer, operationHandlers, types } from '../../util';

/**
 * What the static toolkits need beyond the seam: the gateway answers for the registry, but
 * `whoami`/`listSpaces` read the live client and `listPlugins`/`listTypes` report what this host
 * assembled, neither of which a `Gateway` describes.
 */
export type LocalGateway = Gateway.Shape & {
  readonly client: Client;
  readonly plugins: readonly PluginRecord[];
  readonly types: readonly TypeRecord[];
};

export type PluginRecord = { readonly key: string; readonly name?: string };
export type TypeRecord = { readonly typename: string; readonly version: string };

/**
 * The local MCP gateway: the registry the CLI already runs operations against, presented in the
 * wire shape the projection consumes. `dx mcp serve` is the deployed server's local twin, so every
 * difference from EDGE's gateway is host-layer — no OAuth grant to narrow the session (it sees
 * every visible space), and operations run in-process instead of over a service binding.
 */
export const makeGateway = Effect.fn(function* () {
  const client = yield* ClientService;
  const capabilities = yield* Capability.Service;
  const manager = yield* Capability.get(Capabilities.PluginManager);
  const active = new Set(manager.getActive());
  // Captured so an invocation can erase its own requirements: the tool handlers this gateway
  // backs are invoked by the MCP server layer, which knows nothing of the CLI's services.
  const ambient = yield* Effect.context<ClientService>();

  // The project and task verbs are the annotated ones, so a registry without them projects nothing
  // worth calling; their sets are registered directly for the reason the import above states —
  // the same trade EDGE's operation-service makes for the mail handler sets. `operationHandlers`
  // brings the rest the CLI already curates for chat, including the `database.*` handlers the
  // object tools invoke.
  const handlerSet = OperationHandlerSet.merge(
    ...capabilities.getAll(Capabilities.OperationHandler),
    operationHandlers,
    ProjectOperationHandlerSet.handlers,
    TasksOperationHandlerSet.handlers,
  );
  // An operation reaching the registry from both an activated plugin and the CLI's curated chat
  // list must project once; a second registration is a tool-name collision, which the projection
  // raises rather than resolving silently.
  const handlers = dedupeOperations(yield* handlerSet.handlers);
  const skills = dedupeByKey([...capabilities.getAll(AppCapabilities.SkillDefinition), CodeProjectSkill]);

  // Same visibility rule as EDGE: the HALO space and the settings space hold identity and app
  // config, never user data, so neither surfaces as a space a tool may target.
  const spaceIds = client.spaces
    .get()
    .filter(AppSpace.isVisibleSpace)
    .map((space) => space.id);

  return {
    client,
    spaceIds,

    // Only active plugins contribute capabilities, so an inactive one would be listed as a source
    // of operations that the registry does not carry.
    plugins: manager
      .getPlugins()
      .filter((plugin) => plugin.modules.some((module) => active.has(module.id)))
      .map((plugin) => ({ key: plugin.meta.profile.key, name: plugin.meta.profile.name })),

    types: types.map((entity) => ({ typename: Type.getTypename(entity), version: Type.getVersion(entity) })),

    listOperations: Effect.sync(() => Operation.serializable(handlers).map((record) => Obj.toJSON(record))),

    listSkills: Effect.sync(() =>
      skills.map((definition): Gateway.SkillRecord => {
        // `make()` builds a detached skill whose instructions template holds its text in a
        // ref-embedded `Text` created in-process, so the target always resolves here.
        const skill = definition.make();
        return {
          key: String(definition.key),
          name: skill.name,
          description: skill.description,
          instructions: skill.instructions?.source?.target?.content,
          mcpPrompt: Skill.isMcpPrompt(skill),
          // The atomic unit of projection: these ToolIds decide which operations become tools.
          tools: [...skill.tools],
        };
      }),
    ),

    invokeOperation: (request) => invoke({ handlerSet, handlers, ambient }, request),
  } satisfies LocalGateway;
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
  readonly ambient: Context.Context<ClientService>;
};

const invoke = (
  { handlerSet, handlers, ambient }: InvocationContext,
  { key, input, spaceId }: Gateway.InvokeRequest,
): Effect.Effect<unknown, Gateway.Error> => {
  // A named target that does not parse is an error, not a fallback: treating it as absent runs the
  // call against the session's default space, which is not the space the caller asked for.
  if (spaceId != null && !SpaceId.isValid(spaceId)) {
    return Effect.fail(Gateway.error(`Invalid spaceId: ${spaceId}`));
  }
  return Effect.gen(function* () {
    const handler = handlers.find((candidate) => normalizeKey(String(candidate.meta.key)) === normalizeKey(key));
    if (!handler) {
      return yield* Effect.fail(Gateway.error(`Operation not found: ${key}`));
    }

    const operations = yield* Operation.Service;
    // Arguments arrive in wire form (ref envelopes); decoding runs inside the space's layer so a
    // reference resolves against the database the call targets.
    const decoded = yield* Schema.decodeUnknownEffect(handler.input)(input);
    const output = yield* operations.invoke(handler, decoded);
    return Gateway.snapshot(output);
  }).pipe(
    Effect.provide(
      // The space is baked into the layer, so it is built per call rather than once per server;
      // the client caches the space itself, leaving only layer construction per invocation.
      chatLayer({ provider: 'edge', spaceId: spaceIdOption(spaceId), functions: handlerSet }),
    ),
    Effect.provideContext(ambient),
    Effect.mapError(Gateway.error),
  );
};

const spaceIdOption = (spaceId: string | undefined): Option.Option<SpaceId> =>
  spaceId != null && SpaceId.isValid(spaceId) ? Option.some(spaceId) : Option.none();
