//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import * as McpServer from 'effect/unstable/ai/McpServer';
import * as Tool from 'effect/unstable/ai/Tool';
import * as Toolkit from 'effect/unstable/ai/Toolkit';

import { log } from '@dxos/log';

import { ToolFailure, failure } from './errors';
import * as Gateway from './Gateway';
import * as Projection from './Projection';
import * as Space from './Space';

/**
 * Model-invocable skill loading.
 *
 * A skill's workflow must be readable by the model *before* it uses the tools the workflow
 * governs, and MCP prompts cannot carry that: the specification makes prompts user-controlled —
 * "the user being able to explicitly select them for use"
 * (https://modelcontextprotocol.io/specification/2025-06-18/server/prompts) — so a model can never
 * fetch one on its own. Tools are the model-controlled primitive, so the load step is a tool.
 *
 * This is the shape the MCP "Skills over MCP" working group is standardizing: skill listings carry
 * lightweight metadata, and "the host exposes a single skill-loading tool to the model, keyed by
 * skill name" (SEP-2640, https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2640).
 * When the extension lands in clients this tool becomes an alias for it, not a redesign.
 */
export const SkillLoad = Tool.make('skillLoad', {
  description:
    'Loads a skill: the instructions for a multi-tool workflow hosted on this server. Call this ' +
    "before first using any tool whose description names a skill (e.g. \"part of the 'codeProject' " +
    'workflow"), and follow the returned instructions — they define required setup, argument ' +
    'conventions, and ordering that the tool descriptions alone do not carry. Also useful when the ' +
    'user asks for a workflow by name. The same skills are exposed to users as prompts; loading one ' +
    'here brings the identical text into context without user action. No side effects.',
  parameters: Schema.Struct({
    skill: Schema.String.annotate({
      description: "Skill name as given in a tool description or prompt listing (e.g. 'codeProject').",
    }),
  }),
  success: Schema.Struct({
    name: Schema.String,
    key: Schema.String.annotate({ description: 'Fully-qualified registry key of the skill definition.' }),
    description: Schema.optional(Schema.String),
    instructions: Schema.String.annotate({ description: 'The full workflow text. Follow it.' }),
  }),
  failure: ToolFailure,
})
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Idempotent, true);

export const SkillToolkit = Toolkit.make(SkillLoad);

/**
 * `skillLoad` handlers.
 *
 * A registry outage is a failure here, not an empty result: "skill not found" must mean the name
 * is wrong, never that the backend was down — an actionable error beats an opaque one.
 */
export const SkillHandlers = SkillToolkit.toLayer(
  Effect.map(Gateway.Service, (gateway) =>
    SkillToolkit.of({ skillLoad: ({ skill }) => loadSkillByName(gateway, skill) }),
  ),
);

/** Resolves a skill by prompt name (or full registry key) to the body `skillLoad` returns. */
export const loadSkillByName = (
  gateway: Gateway.Shape,
  skill: string,
): Effect.Effect<{ name: string; key: string; description?: string; instructions: string }, ToolFailure> =>
  gateway.listSkills.pipe(
    Effect.mapError((error) => failure('operation_failed', `skillLoad failed: ${error.message}`)),
    Effect.flatMap((skills) => {
      // The same projection the prompts use, so a skill answers to exactly one name in both
      // surfaces; the full key is accepted too for callers that copied it from a listing.
      const projected = Projection.projectSkills(skills, []);
      // Registry keys carry a `dxn:` prefix; accept the caller's spelling with or without it.
      const requested = skill.replace(/^dxn:/, '');
      const match = projected.find(
        (candidate) => candidate.promptName === requested || candidate.key.replace(/^dxn:/, '') === requested,
      );
      if (!match) {
        const available = projected.map((candidate) => candidate.promptName).join(', ');
        return Effect.fail(
          failure(
            'invalid_request',
            `Unknown skill: '${skill}'. Available skills: ${available.length > 0 ? available : '(none)'}.`,
          ),
        );
      }
      return Effect.succeed({
        name: match.promptName,
        key: match.key,
        description: match.description,
        instructions: match.instructions,
      });
    }),
  );

/**
 * Fetches the registry and projects annotated operations.
 *
 * A registry outage degrades to zero projected tools (the host's static surface keeps serving). A
 * name collision inside {@link Projection.projectOperations} throws as a defect and deliberately
 * escapes: that is an authorship error, not an outage.
 */
export const loadOperations = (
  reservedNames: readonly string[],
): Effect.Effect<Projection.ProjectedOperation[], never, Gateway.Service> =>
  Effect.flatMap(Gateway.Service, (gateway) => gateway.listOperations).pipe(
    Effect.map((operations) => Projection.projectOperations(operations, reservedNames)),
    Effect.catch((error) => {
      log.warn('operation registry unavailable; serving static tools only', { error: error.message });
      return Effect.succeed<Projection.ProjectedOperation[]>([]);
    }),
  );

/** Fetches the registry and projects opted-in skills; same failure split as {@link loadOperations}. */
export const loadSkills = (
  reservedNames: readonly string[],
): Effect.Effect<Projection.ProjectedSkill[], never, Gateway.Service> =>
  Effect.flatMap(Gateway.Service, (gateway) => gateway.listSkills).pipe(
    Effect.map((skills) => Projection.projectSkills(skills, reservedNames)),
    Effect.catch((error) => {
      log.warn('skill registry unavailable; serving static prompts only', { error: error.message });
      return Effect.succeed<Projection.ProjectedSkill[]>([]);
    }),
  );

/**
 * Builds the MCP toolkit layer for projected operations.
 *
 * Every projected tool gains the session's optional `spaceId` parameter (stripped before
 * invocation); ref-valued inputs are already envelope-shaped in the operations' own schemas — the
 * upstream verbs were written to be invocable from a remote host. Outputs are objects by upstream
 * convention; a non-object output is wrapped as `{ output }` because MCP requires
 * `structuredContent` to be a JSON object.
 */
export const toolsLayer = (
  projected: readonly Projection.ProjectedOperation[],
): Layer.Layer<never, never, Gateway.Service> => {
  const tools = projected.map(makeTool);
  // A toolkit assembled from runtime data has no per-tool type information to keep, so the casts
  // through this function restate what the registry cannot prove: the handler record matches the
  // toolkit built from the same list, one entry per projected operation.
  const toolkit = Toolkit.make(...(tools as any[]));
  const handlers = toolkit.toLayer(
    Effect.gen(function* () {
      const gateway = yield* Gateway.Service;
      return Object.fromEntries(
        projected.map((operation) => [operation.toolName, makeHandler(gateway, operation)]),
      ) as never;
    }),
  );
  return McpServer.toolkit(toolkit).pipe(Layer.provide(handlers)) as unknown as Layer.Layer<
    never,
    never,
    Gateway.Service
  >;
};

/** The MCP tool descriptor for a projected operation, carrying its safety hints. */
export const makeTool = (operation: Projection.ProjectedOperation) =>
  Tool.make(operation.toolName, {
    description: operation.description,
    parameters: Schema.Struct({
      ...operation.parameters,
      ...('spaceId' in operation.parameters ? {} : { spaceId: Space.idParameter }),
    }),
    success: Schema.Record(Schema.String, Schema.Unknown),
    failure: ToolFailure,
  })
    .annotate(Tool.Readonly, operation.safety === 'read')
    .annotate(Tool.Destructive, operation.safety === 'destructive');

/** Dispatches one projected tool call: encode input, resolve the space, invoke, qualify refs. */
export const makeHandler =
  (gateway: Gateway.Shape, operation: Projection.ProjectedOperation) =>
  (args: Record<string, unknown> | undefined): Effect.Effect<Record<string, unknown>, ToolFailure> => {
    const { spaceId, ...decodedInput } = args ?? {};
    // The tool layer decoded the arguments (ref envelopes became live `Ref`s); encode back to the
    // wire form the gateway expects — live refs cannot cross an RPC boundary.
    const encodeInput =
      operation.inputSchema != null
        ? Schema.encodeUnknownEffect(operation.inputSchema)(decodedInput).pipe(
            Effect.mapError((error) =>
              failure('invalid_request', `${operation.toolName} input did not encode: ${String(error)}`),
            ),
          )
        : Effect.succeed<unknown>(decodedInput);
    return encodeInput.pipe(
      // The space is resolved after encoding, because the wire form is where a reference argument
      // states which space it belongs to.
      Effect.flatMap((input) =>
        Space.resolveId(gateway.spaceIds, (spaceId as string | undefined) ?? Space.hintFromInput(input)).pipe(
          Effect.flatMap((resolvedSpaceId) =>
            gateway.invokeOperation({ key: operation.key, input, spaceId: resolvedSpaceId }).pipe(
              Effect.mapError((error) => failure('operation_failed', `${operation.key} failed: ${error.message}`)),
              Effect.map((output) => Space.qualifyRefs(output, resolvedSpaceId)),
            ),
          ),
        ),
      ),
      Effect.map((output) =>
        output !== null && typeof output === 'object' && !Array.isArray(output)
          ? (output as Record<string, unknown>)
          : { output },
      ),
    );
  };

/**
 * Builds the prompt layers for projected skills. The instructions text is captured at projection
 * time, so `prompts/get` involves no further registry round-trip.
 */
export const promptsLayer = (projected: readonly Projection.ProjectedSkill[]): Layer.Layer<never> =>
  Layer.mergeAll(
    ...(projected.map((skill) =>
      McpServer.prompt({
        name: skill.promptName,
        description: skill.description,
        parameters: {},
        content: () => Effect.succeed(skill.instructions),
      }),
    ) as [Layer.Layer<never>, ...Layer.Layer<never>[]]),
  );

export type LayerOptions = {
  /** Names of the host's statically-defined tools; a projected operation may not claim one. */
  readonly reservedToolNames?: readonly string[];
  /** Names of the host's statically-defined prompts; a projected skill may not claim one. */
  readonly reservedPromptNames?: readonly string[];
};

/**
 * The whole projected surface — annotated operations as tools, opted-in skills as prompts, and
 * `skillLoad` — read from the registry when the layer is built. Hosts merge their own static
 * toolkits alongside and declare those names as reserved.
 */
export const layer = ({ reservedToolNames = [], reservedPromptNames = [] }: LayerOptions = {}): Layer.Layer<
  never,
  never,
  Gateway.Service
> =>
  Effect.gen(function* () {
    const [operations, skills] = yield* Effect.all(
      [loadOperations([...reservedToolNames, SkillLoad.name]), loadSkills(reservedPromptNames)],
      { concurrency: 2 },
    );
    return Layer.mergeAll(
      McpServer.toolkit(SkillToolkit).pipe(Layer.provide(SkillHandlers)),
      ...(operations.length > 0 ? [toolsLayer(operations)] : []),
      ...(skills.length > 0 ? [promptsLayer(skills)] : []),
    );
  }).pipe(Layer.unwrap);
