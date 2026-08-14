//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import * as Sink from 'effect/Sink';
import * as EffectStdio from 'effect/Stdio';
import * as McpServer from 'effect/unstable/ai/McpServer';
import * as Tool from 'effect/unstable/ai/Tool';
import * as Toolkit from 'effect/unstable/ai/Toolkit';

import { log } from '@dxos/log';

import * as Gateway from './Gateway';
export { ToolFailure, type ToolFailureCode, failure } from './internal/failure';
import { ToolFailure, failure } from './internal/failure';
import * as iconInternal from './internal/icon';
import * as identityInternal from './internal/identity';
import * as Projection from './internal/projection';
import * as spaceInternal from './internal/space';
import * as wireInternal from './internal/wire';

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
  // Set explicitly: a client defaults an unset `destructiveHint` to true, which a read-only tool
  // then advertises alongside `readOnlyHint` as a contradiction.
  .annotate(Tool.Destructive, false)
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
      ...('spaceId' in operation.parameters ? {} : { spaceId: spaceInternal.idParameter }),
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
        spaceInternal
          .resolveId(gateway.spaceIds, (spaceId as string | undefined) ?? spaceInternal.hintFromInput(input))
          .pipe(
            Effect.flatMap((resolvedSpaceId) =>
              gateway.invokeOperation({ key: operation.key, input, spaceId: resolvedSpaceId }).pipe(
                Effect.mapError((error) => failure('operation_failed', `${operation.key} failed: ${error.message}`)),
                Effect.map((output) => spaceInternal.qualifyRefs(output, resolvedSpaceId)),
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

//
// Transports.
//
// The response passes belong to the surface, not to a transport — every host runs the same ones or
// its clients disagree about what this server offers — so each transport applies them on the way
// out rather than leaving it to the caller.
//

/**
 * Platform stdio with the response passes applied to every outgoing message.
 *
 * Wraps whatever `Stdio` the runtime provides, so a host installs it beneath `McpServer.layerStdio`
 * and needs to know nothing about the passes.
 */
export const stdio: Layer.Layer<EffectStdio.Stdio, never, EffectStdio.Stdio> = Layer.effect(
  EffectStdio.Stdio,
  Effect.map(EffectStdio.Stdio, (stdio) =>
    EffectStdio.make({
      ...stdio,
      stdout: (options) => Sink.mapInput(stdio.stdout(options), wireInternal.normalizeLine),
    }),
  ),
);

/**
 * The same passes over an HTTP response body, plus the batch unwrap the transport requires, for a
 * host that owns its own transport (`McpServer.layerHttp` behind a worker's fetch handler).
 *
 * `serverInfo` is merged into the `initialize` result on top of the shared identity: the MCP
 * `Implementation` may carry `title`, `websiteUrl` and `icons`, and `McpServer` offers no way to
 * supply them. Pass `icons` here — they need an origin, which only the host knows.
 */
export const normalizeResponse = async (
  response: Response,
  options: { readonly serverInfo?: Record<string, unknown> } = {},
): Promise<Response> => {
  if (!response.headers.get('content-type')?.includes('application/json')) {
    return response;
  }
  const text = await response.text();
  const unwrapped = unwrapBatch(text);
  const normalized = wireInternal.normalizeText(unwrapped, options);
  return new Response(normalized ?? unwrapped, { status: response.status, headers: response.headers });
};

/**
 * Unwraps a single-element JSON-RPC batch.
 *
 * Effect's RPC HTTP transport always answers with an array, while MCP's Streamable HTTP transport
 * requires a lone JSON-RPC object for a single request — and a client that gets the array does not
 * recognise the server's tools at all. Spec compliance rather than host policy, so every HTTP host
 * needs it and none should have to know that.
 */
const unwrapBatch = (text: string): string => {
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) && parsed.length === 1 ? JSON.stringify(parsed[0]) : text;
  } catch {
    return text;
  }
};

//
// Helpers for host-authored tools.
//
// A host that still hand-writes a verb (EDGE's object/space/discovery toolkits, until the gateway
// covers them) needs the conventions the projected tools follow, or the two disagree about which
// space a call targets.
//

export const spaceIdParameter = spaceInternal.idParameter;
export const resolveSpaceId = spaceInternal.resolveId;
export const qualifyRefs = spaceInternal.qualifyRefs;

/** JSON ref envelope an operation's input schema decodes back into a live `Ref`. */
export const refEnvelope = (id: string): { '/': string } => ({ '/': id });

//
// Server identity, shared by every host.
//

export const identity = identityInternal.identity;
export const icons = iconInternal.icons;
export const iconResponse = iconInternal.iconResponse;
export const ICON_LIGHT_PATH = iconInternal.ICON_LIGHT_PATH;
export const ICON_DARK_PATH = iconInternal.ICON_DARK_PATH;
