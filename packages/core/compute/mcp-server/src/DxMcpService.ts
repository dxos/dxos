//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Obj } from '@dxos/echo';
import { SpaceId } from '@dxos/keys';

import * as Gateway from './Gateway';
import * as Server from './Server';

/**
 * The in-process front door to the MCP surface: hand it skill definitions, get the projected
 * server. Skills are the atomic unit of projection, so this is the whole input — each definition
 * becomes a prompt and the operations behind its tools become the tools, exactly as they would
 * through a registry-backed {@link Gateway.Service}. That gateway survives for hosts whose
 * registry sits across an RPC boundary (edge); this module is for hosts that hold the definitions
 * in-process and provide `Operation.Service`.
 *
 * This module needs the operation runtime; a wire-only host (edge) imports the `Gateway`/`Server`
 * subpaths instead of the root barrel so its bundle never carries it.
 */

export type Options = {
  /**
   * Skill definitions to serve. Each must carry `operations` (the definitions behind its ToolIds)
   * for its tools to project — there is no registry here to resolve them against — and only skills
   * whose built object opts in via `mcpPrompt` project at all.
   */
  skills: readonly Skill.Definition[];
  /**
   * Spaces the session may address; the first is the fallback when a call omits `spaceId`.
   * Empty (the default) means unrestricted — the invoker's own database context decides.
   */
  spaceIds?: readonly string[];
  /** Names of the host's statically-defined tools; a projected operation may not claim one. */
  reservedToolNames?: readonly string[];
  /** Names of the host's statically-defined prompts; a projected skill may not claim one. */
  reservedPromptNames?: readonly string[];
};

/** NSID equality for a definition key against an invoke-request key (`dxn:`/version stripped). */
const normalizeKey = (key: string): string => key.replace(/^dxn:/, '').replace(/:\d+\.\d+\.\d+$/, '');

/**
 * Builds a {@link Gateway.Shape} over the definitions: skills listed with their tools, operations
 * serialized to wire records, invocation through the ambient `Operation.Service` with the target
 * space passed as `InvokeOptions.spaceId`.
 */
export const gateway = ({
  skills,
  spaceIds = [],
}: Pick<Options, 'skills' | 'spaceIds'>): Effect.Effect<Gateway.Shape, never, Operation.Service> =>
  Effect.gen(function* () {
    const invoker = yield* Operation.Service;
    const built = skills.map((definition) => ({ definition, skill: definition.make() }));

    // One record per operation whatever the number of skills naming it; a definition whose schema
    // cannot render as JSON Schema is dropped with a warning rather than failing the listing.
    const operations = new Map<string, Operation.Definition.Any>();
    for (const { definition } of built) {
      for (const operation of definition.operations ?? []) {
        operations.set(normalizeKey(String(operation.meta.key)), operation);
      }
    }
    const records = Operation.serializable([...operations.values()]).map((record) => Obj.toJSON(record));

    return {
      spaceIds,
      listOperations: Effect.succeed(records),
      listSkills: Effect.succeed(
        built.map(({ definition, skill }): Gateway.SkillRecord => ({
          key: String(definition.key),
          name: skill.name,
          description: skill.description,
          // Detached skills hold their instructions in a ref-embedded `Text` created in-process,
          // so the target always resolves here.
          instructions: skill.instructions?.source?.target?.content,
          mcpPrompt: Skill.isMcpPrompt(skill),
          tools: [...skill.tools],
        })),
      ),
      invokeOperation: ({ key, input, spaceId }) =>
        Effect.gen(function* () {
          const operation = operations.get(normalizeKey(key));
          if (!operation) {
            return yield* Effect.fail(Gateway.error(`Operation not found: ${key}`));
          }
          // A named target that does not parse is an error, not a fallback: silently running the
          // call against the invoker's default context is not the space the caller asked for.
          const targetSpaceId = spaceId != null && SpaceId.isValid(spaceId) ? spaceId : undefined;
          if (spaceId != null && targetSpaceId == null) {
            return yield* Effect.fail(Gateway.error(`Invalid spaceId: ${spaceId}`));
          }
          // Arguments arrive in wire form (ref envelopes); `invoke` does not decode its input, so
          // the projected schema is applied here, at the boundary where they arrive.
          const decoded = yield* Schema.decodeUnknownEffect(operation.input)(input).pipe(
            Effect.mapError(Gateway.error),
          );
          const output = yield* invoker
            .invoke(operation, decoded, targetSpaceId != null ? { spaceId: targetSpaceId } : undefined)
            .pipe(
              Effect.mapError(Gateway.error),
              Effect.catchDefect((defect) => Effect.fail(Gateway.error(defect))),
            );
          return Gateway.snapshot(output);
        }),
    } satisfies Gateway.Shape;
  });

/**
 * The projected MCP surface over the given skills: prompts, tools and `skillLoad`, requiring only
 * the operation invoker. Merge the host's transport beneath, exactly as with {@link Server.layer}.
 */
export const make = ({
  skills,
  spaceIds,
  reservedToolNames,
  reservedPromptNames,
}: Options): Layer.Layer<never, never, Operation.Service> =>
  Server.layer({ reservedToolNames, reservedPromptNames }).pipe(
    Layer.provide(Layer.effect(Gateway.Service, gateway({ skills, spaceIds }))),
  );
