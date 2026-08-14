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
import { ClientService } from '@dxos/client';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Skill from '@dxos/compute/Skill';
import { Obj } from '@dxos/echo';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { Gateway } from '@dxos/mcp-server';
// Narrow subpath imports: these plugins declare React surfaces, and a bundler follows the dynamic
// import behind a lazy capability, so activating them would pull React into the CLI binary.
import { ProjectOperationHandlerSet } from '@dxos/plugin-projects/operations';
import { CodeProjectSkillDefinition } from '@dxos/plugin-projects/skills';
import { TasksOperationHandlerSet } from '@dxos/plugin-tasks/operations';

import { chatLayer } from '../../util';

/**
 * The local MCP gateway: the registry the CLI already runs operations against, presented in the
 * wire shape the projection consumes. `dx mcp serve` is the deployed server's local twin, so every
 * difference from EDGE's gateway is host-layer — no OAuth grant to narrow the session (it sees
 * every visible space), and operations run in-process instead of over a service binding.
 */
export const makeGateway = Effect.fn(function* () {
  const client = yield* ClientService;
  const capabilities = yield* Capability.Service;
  // Captured so an invocation can erase its own requirements: the tool handlers this gateway
  // backs are invoked by the MCP server layer, which knows nothing of the CLI's services.
  const ambient = yield* Effect.context<ClientService>();

  // The project and task verbs are the annotated ones, so a registry without them projects nothing
  // worth calling; their sets are registered directly for the reason the import above states —
  // the same trade EDGE's operation-service makes for the mail handler sets.
  const handlerSet = OperationHandlerSet.merge(
    ...capabilities.getAll(Capabilities.OperationHandler),
    ProjectOperationHandlerSet,
    TasksOperationHandlerSet,
  );
  const handlers = yield* handlerSet.handlers;
  const skills = dedupeByKey([...capabilities.getAll(AppCapabilities.SkillDefinition), CodeProjectSkillDefinition]);

  // Same visibility rule as EDGE: the HALO space and the settings space hold identity and app
  // config, never user data, so neither surfaces as a space a tool may target.
  const spaceIds = client.spaces
    .get()
    .filter(AppSpace.isVisibleSpace)
    .map((space) => space.id);

  return {
    spaceIds,

    listOperations: Effect.sync(() => serializableHandlers(handlers).map((record) => Obj.toJSON(record))),

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
        };
      }),
    ),

    invokeOperation: (request) => invoke({ handlerSet, handlers, ambient }, request),
  } satisfies Gateway.Shape;
});

/**
 * Serializes each handler, dropping (with a warning) any whose schema cannot render as JSON Schema.
 * Listing is otherwise all-or-nothing: one such operation — e.g. `space.importSpace`, whose archive
 * payload is a `Uint8Array` — would take every other operation down with it.
 */
const serializableHandlers = (
  handlers: readonly Operation.WithHandler<Operation.Definition.Any>[],
): Operation.PersistentOperation[] =>
  handlers.flatMap((handler) => {
    try {
      return [Operation.serialize(handler)];
    } catch (error) {
      log.warn('operation is not serializable; excluded from the registry', {
        key: String(handler.meta.key),
        error: String(error),
      });
      return [];
    }
  });

/** Operation keys travel with or without the `dxn:` prefix; compare them stripped. */
const normalizeKey = (key: string): string => key.replace(/^dxn:/, '');

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
): Effect.Effect<unknown, Gateway.Error> =>
  Effect.gen(function* () {
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

const spaceIdOption = (spaceId: string | undefined): Option.Option<SpaceId> =>
  spaceId != null && SpaceId.isValid(spaceId) ? Option.some(spaceId) : Option.none();
