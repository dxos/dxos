//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import * as Sink from 'effect/Sink';
import * as EffectStdio from 'effect/Stdio';
import * as McpServer$ from 'effect/unstable/ai/McpServer';
import * as Tool from 'effect/unstable/ai/Tool';
import * as Toolkit from 'effect/unstable/ai/Toolkit';

import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Obj } from '@dxos/echo';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import * as Catalog from './internal/catalog';
import * as McpRegistry from './McpRegistry';
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
 * The MCP "Skills over MCP" draft (SEP-2640, extension id `io.modelcontextprotocol/skills`,
 * https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2640) models skills as
 * `skill://` resources served through `skills/list` / `skills/get`; the single model-invocable
 * load tool is the *client's* affordance over them. This server-side tool is the polyfill for
 * clients without the extension — serving the resources alongside it is additive when the draft
 * settles, and `projectSkills` already yields everything the frontmatter needs.
 */
export const SkillLoad = Tool.make('skillLoad', {
  description:
    'Loads a skill: the instructions for a multi-tool workflow hosted on this server. Call this ' +
    'before first invoking any operation whose findOperations row names a skill, and follow the ' +
    'returned instructions — they define required setup, argument conventions, and ordering that ' +
    'operation descriptions alone do not carry. Omit the skill argument to list every skill this ' +
    'server offers. The same skills are exposed to users as prompts; loading one here brings the ' +
    'identical text into context without user action. No side effects.',
  parameters: Schema.Struct({
    skill: Schema.optional(
      Schema.String.annotate({
        description:
          "Skill name as given in a findOperations row or the prompt listing (e.g. 'codeProject'). " +
          'Omit to list the available skills instead of loading one.',
      }),
    ),
  }),
  success: Schema.Struct({
    skills: Schema.Array(
      Schema.Struct({
        name: Schema.String,
        key: Schema.String.annotate({ description: 'Fully-qualified registry key of the skill definition.' }),
        description: Schema.optional(Schema.String),
      }),
    ).annotate({ description: 'Every skill when none was named, otherwise just the one that was loaded.' }),
    instructions: Schema.optional(
      Schema.String.annotate({ description: "The named skill's full workflow text. Follow it." }),
    ),
  }),
  failure: ToolFailure,
})
  .annotate(Tool.Readonly, true)
  // Set explicitly: a client defaults an unset `destructiveHint` to true, which a read-only tool
  // then advertises alongside `readOnlyHint` as a contradiction.
  .annotate(Tool.Destructive, false)
  .annotate(Tool.Idempotent, true);

/**
 * Discovery over the operations this server can invoke.
 *
 * Operations are data a model searches rather than tools it is handed: a host registers dozens,
 * and advertising each as its own MCP tool spends the client's context on schemas for operations
 * the task will never touch. The cost of the indirection is one extra round trip before the first
 * call, which is why the schemas come back from this same tool rather than from a third one.
 */
export const FindOperations = Tool.make('findOperations', {
  description:
    'Finds the operations this server can run — the verbs that read and write objects in DXOS ' +
    'spaces. Start here: search with a query describing the task, then call invokeOperation with ' +
    'the key of the operation you chose. Rows are compact (key, description, the skills the ' +
    'operation belongs to, whether it targets a space, and whether it mutates); pass keys to get ' +
    "the named operations' full input and output JSON Schema, which you need before invoking one " +
    'for the first time. Omit every argument to list everything available. No side effects.',
  parameters: Schema.Struct({
    query: Schema.optional(
      Schema.String.annotate({
        description:
          "Words to match against operation keys, names and descriptions (e.g. 'create task'). All " +
          'terms must match. Omit to match everything.',
      }),
    ),
    skill: Schema.optional(
      Schema.String.annotate({ description: "Only operations belonging to this skill (e.g. 'codeProject')." }),
    ),
    keys: Schema.optional(
      Schema.Array(Schema.String).annotate({
        description:
          'Exact operation keys. Naming them returns their full input and output schemas instead ' +
          'of compact rows — the lookup to run once you have chosen what to invoke.',
      }),
    ),
  }),
  success: Schema.Struct({
    operations: Schema.Array(
      Schema.Struct({
        key: Schema.String.annotate({ description: 'Pass this to invokeOperation.' }),
        name: Schema.optional(Schema.String),
        description: Schema.optional(Schema.String),
        skills: Schema.Array(Schema.String).annotate({
          description: 'Skills this operation belongs to; load one with skillLoad before invoking.',
        }),
        requiresSpace: Schema.Boolean.annotate({
          description: 'Whether the operation acts on a space, making invokeOperation spaceId load-bearing.',
        }),
        mutation: Schema.optional(
          Schema.String.annotate({
            description: "Effect on state: 'none' reads, 'write' creates or updates, 'destructive' deletes.",
          }),
        ),
        idempotent: Schema.optional(Schema.Boolean),
        inputSchema: Schema.optional(
          Schema.Unknown.annotate({ description: 'JSON Schema of the input; returned for a keys lookup only.' }),
        ),
        outputSchema: Schema.optional(Schema.Unknown),
      }),
    ),
  }),
  failure: ToolFailure,
})
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false)
  .annotate(Tool.Idempotent, true);

/**
 * The single dispatch tool.
 *
 * Safety is a property of the operation rather than of this tool, so the hints a per-operation
 * tool once carried — and which a client turns into its permission prompt — cannot ride on the
 * annotations here: it is marked possibly-destructive because some operation reached through it
 * is. The per-operation classification still reaches the model, on the `mutation` field of the
 * `findOperations` row.
 */
export const InvokeOperation = Tool.make('invokeOperation', {
  description:
    'Invokes an operation by key — how every read and write on this server is performed. Find the ' +
    'key with findOperations and fetch its input schema (findOperations with keys) before the ' +
    "first call; input must match that schema. Check the operation's mutation class in its row " +
    'before invoking: this tool is as destructive as whatever it is asked to run. References ' +
    'between objects travel as {"/": "echo://<spaceId>/<objectId>"} envelopes — pass them back ' +
    'exactly as received.',
  parameters: Schema.Struct({
    key: Schema.String.annotate({ description: 'Operation key, exactly as findOperations reported it.' }),
    input: Schema.optional(
      Schema.Record(Schema.String, Schema.Unknown).annotate({
        description: "The operation's arguments, matching the input schema findOperations returned for this key.",
      }),
    ),
    spaceId: spaceInternal.idParameter,
  }),
  success: Schema.Record(Schema.String, Schema.Unknown),
  failure: ToolFailure,
})
  .annotate(Tool.Readonly, false)
  .annotate(Tool.Destructive, true);

/** The whole fixed tool surface: discovery, dispatch, and skill loading. */
export const ServerToolkit = Toolkit.make(FindOperations, InvokeOperation, SkillLoad);

/** Names this package claims; a host's static toolkit may not take one. */
export const TOOL_NAMES = [FindOperations.name, InvokeOperation.name, SkillLoad.name] as const;

export type SkillListing = {
  skills: readonly { name: string; key: string; description?: string }[];
  instructions?: string;
};

/**
 * Resolves a skill by prompt name (or full registry key) to the body `skillLoad` returns; with no
 * name, lists them all.
 *
 * A registry outage is a failure here, not an empty result: "skill not found" must mean the name
 * is wrong, never that the backend was down — an actionable error beats an opaque one.
 */
export const loadSkillByName = (
  gateway: McpRegistry.Shape,
  skill: string | undefined,
): Effect.Effect<SkillListing, ToolFailure> =>
  gateway.listSkills.pipe(
    Effect.mapError((error) => failure('operation_failed', `skillLoad failed: ${error.message}`)),
    // The same projection the prompts use, so a skill answers to exactly one name in both
    // surfaces; the full key is accepted too for callers that copied it from a listing. It throws
    // on a name collision, which inside the request path is this call's failure rather than a
    // defect that takes the handler down.
    Effect.flatMap((skills) =>
      Effect.try({
        try: () => Projection.projectSkills(skills, []),
        catch: (error) => failure('operation_failed', `skillLoad failed: ${String(error)}`),
      }),
    ),
    Effect.flatMap((projected) => {
      const summarize = (candidate: Projection.ProjectedSkill) => ({
        name: candidate.promptName,
        key: candidate.key,
        description: candidate.description,
      });
      if (skill == null) {
        return Effect.succeed<SkillListing>({ skills: projected.map(summarize) });
      }
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
      return Effect.succeed<SkillListing>({ skills: [summarize(match)], instructions: match.instructions });
    }),
  );

/**
 * Fetches the registry and projects the operations the given skills' tools name.
 *
 * A registry outage degrades to an empty catalog: `findOperations` then reports nothing to call,
 * and the host's static surface keeps serving.
 */
export const loadOperations = (
  skills: readonly Projection.ProjectedSkill[],
): Effect.Effect<Projection.ProjectedOperation[], never, McpRegistry.Service> =>
  Effect.flatMap(McpRegistry.Service, (gateway) => gateway.listOperations).pipe(
    Effect.map((operations) => Projection.projectOperations(operations, skills)),
    Effect.catch((error) => {
      log.warn('operation registry unavailable; findOperations will report nothing to call', {
        error: error.message,
      });
      return Effect.succeed<Projection.ProjectedOperation[]>([]);
    }),
  );

/** Fetches the registry and projects opted-in skills; same failure split as {@link loadOperations}. */
export const loadSkills = (
  reservedNames: readonly string[],
): Effect.Effect<Projection.ProjectedSkill[], never, McpRegistry.Service> =>
  Effect.flatMap(McpRegistry.Service, (gateway) => gateway.listSkills).pipe(
    Effect.map((skills) => Projection.projectSkills(skills, reservedNames)),
    Effect.catch((error) => {
      log.warn('skill registry unavailable; serving static prompts only', { error: error.message });
      return Effect.succeed<Projection.ProjectedSkill[]>([]);
    }),
  );

/** The fixed tool surface, bound to a catalog: discovery and dispatch over the projected operations. */
export const surfaceLayer = (catalog: Catalog.Catalog): Layer.Layer<never, never, McpRegistry.Service> =>
  McpServer$.toolkit(ServerToolkit).pipe(
    Layer.provide(
      ServerToolkit.toLayer(
        Effect.map(McpRegistry.Service, (gateway) =>
          ServerToolkit.of({
            findOperations: (query) => Effect.succeed({ operations: catalog.find(query) }),
            invokeOperation: (args) => invoke(gateway, catalog, args),
            skillLoad: ({ skill }) => loadSkillByName(gateway, skill),
          }),
        ),
      ),
    ),
  );

/**
 * Dispatches one `invokeOperation` call: validate the input, resolve the space, invoke, qualify refs.
 *
 * The input arrives as raw JSON rather than through a per-operation tool schema, so validating it
 * here is what turns a malformed call into an error naming the offending field instead of a
 * failure from somewhere inside the handler. Ref-valued inputs are envelope-shaped in the
 * operations' own schemas — the upstream verbs were written to be invocable from a remote host —
 * and the decode/encode round trip also normalizes a ref the model sent JSON-stringified. Outputs
 * are objects by upstream convention; a non-object output is wrapped as `{ output }` because MCP
 * requires `structuredContent` to be a JSON object.
 */
export const invoke = (
  gateway: McpRegistry.Shape,
  catalog: Catalog.Catalog,
  { key, input, spaceId }: { key: string; input?: Record<string, unknown>; spaceId?: string },
): Effect.Effect<Record<string, unknown>, ToolFailure> => {
  const operation = catalog.get(key);
  if (!operation) {
    return Effect.fail(
      failure(
        'invalid_request',
        `Unknown operation: '${key}'. Call findOperations to list the operations this server can run.`,
      ),
    );
  }

  const arguments_ = input ?? {};
  const wireInput =
    operation.decodeSchema != null && operation.wireSchema != null
      ? Schema.decodeUnknownEffect(operation.decodeSchema)(arguments_).pipe(
          Effect.flatMap(Schema.encodeUnknownEffect(operation.wireSchema)),
          Effect.mapError((error) =>
            failure(
              'invalid_request',
              `${operation.key} input did not match its schema: ${String(error)}. Call findOperations ` +
                `with keys: ['${operation.key}'] for the schema it expects.`,
            ),
          ),
        )
      : Effect.succeed<unknown>(arguments_);

  return wireInput.pipe(
    // The space is resolved after encoding, because the wire form is where a reference argument
    // states which space it belongs to. An operation declaring `spaceId` itself states it there.
    Effect.flatMap((wire) =>
      spaceInternal
        .resolveId(
          gateway.spaceIds,
          spaceId ?? declaredSpaceId(operation, arguments_) ?? spaceInternal.hintFromInput(wire),
        )
        .pipe(
          Effect.flatMap((resolvedSpaceId) =>
            gateway.invokeOperation({ key: operation.key, input: wire, spaceId: resolvedSpaceId }).pipe(
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
 * The space named by the operation's own `spaceId` field, when it declares one.
 *
 * Such an operation takes its target inside `input` rather than through the tool's ambient
 * parameter, and that value is as much a statement of which space the call targets as the ambient
 * one — without reading it the call would run against the session default while the operation
 * itself acted on the space it was given.
 */
const declaredSpaceId = (operation: Catalog.CatalogEntry, input: Record<string, unknown>): string | undefined => {
  const declared = 'spaceId' in operation.parameters ? input.spaceId : undefined;
  return typeof declared === 'string' ? declared : undefined;
};

/**
 * Builds the prompt layers for projected skills. The instructions text is captured at projection
 * time, so `prompts/get` involves no further registry round-trip.
 */
export const promptsLayer = (projected: readonly Projection.ProjectedSkill[]): Layer.Layer<never> =>
  Layer.mergeAll(
    ...(projected.map((skill) =>
      McpServer$.prompt({
        name: skill.promptName,
        description: skill.description,
        parameters: {},
        content: () => Effect.succeed(skill.instructions),
      }),
    ) as [Layer.Layer<never>, ...Layer.Layer<never>[]]),
  );

export type LayerOptions = {
  /** Names of the host's statically-defined tools; none may be one of {@link TOOL_NAMES}. */
  readonly reservedToolNames?: readonly string[];
  /** Names of the host's statically-defined prompts; a projected skill may not claim one. */
  readonly reservedPromptNames?: readonly string[];
};

/**
 * The whole projected surface — `findOperations` / `invokeOperation` / `skillLoad` over the
 * operations opted-in skills name, plus those skills as prompts — read from the registry when the
 * layer is built. Hosts merge their own static toolkits alongside and declare those names as
 * reserved.
 */
export const layer = ({ reservedToolNames = [], reservedPromptNames = [] }: LayerOptions = {}): Layer.Layer<
  never,
  never,
  McpRegistry.Service
> =>
  Effect.gen(function* () {
    const claimed = reservedToolNames.filter((name) => (TOOL_NAMES as readonly string[]).includes(name));
    if (claimed.length > 0) {
      // Loud at layer build: a host static tool of the same name would shadow this package's,
      // leaving the server advertising one tool and dispatching the other.
      throw new Error(`MCP tool name collision: the host reserves names this server defines: ${claimed.join(', ')}.`);
    }
    // Skills first: they are the atomic unit of projection, so the catalog derives from them.
    const skills = yield* loadSkills(reservedPromptNames);
    const operations = yield* loadOperations(skills);
    return Layer.mergeAll(surfaceLayer(Catalog.make(operations)), ...(skills.length > 0 ? [promptsLayer(skills)] : []));
  }).pipe(Layer.unwrap);

//
// Transports.
//
// The response passes belong to the surface, not to a transport — every host runs the same ones or
// its clients disagree about what this server offers — so each transport applies them on the way
// out rather than leaving it to the caller.
//

/**
 * Effect's own server pieces, re-exported so a host composing its static toolkits and transport
 * needs one `McpServer` import rather than two under different names.
 */
export const toolkit = McpServer$.toolkit;
export const layerStdio = McpServer$.layerStdio;

/**
 * Platform stdio with the response passes applied to every outgoing message.
 *
 * Wraps whatever `Stdio` the runtime provides, so a host installs it beneath effect's `McpServer.layerStdio`
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
 * host that owns its own transport (effect's `McpServer.layerHttp` behind a worker's fetch handler).
 *
 * `serverInfo` is merged into the `initialize` result on top of the shared identity: the MCP
 * `Implementation` may carry `title`, `websiteUrl` and `icons`, and effect's `McpServer` offers no way to
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
  const headers = new Headers(response.headers);
  // The passes above change the body length, so an upstream `Content-Length` now describes a body
  // that no longer exists; a client that trusts it truncates the response.
  headers.delete('content-length');
  return new Response(normalized ?? unwrapped, { status: response.status, headers });
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

//
// Skill-backed surface: definitions held in process, rather than a registry read over the gateway.
//

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
 * Builds a {@link McpRegistry.Shape} over the definitions: skills listed with their tools, operations
 * serialized to wire records, invocation through the ambient `Operation.Service` with the target
 * space passed as `InvokeOptions.spaceId`.
 */
export const gateway = ({
  skills,
  spaceIds = [],
}: Pick<Options, 'skills' | 'spaceIds'>): Effect.Effect<McpRegistry.Shape, never, Operation.Service> =>
  Effect.gen(function* () {
    const invoker = yield* Operation.Service;
    const built = skills.map((definition) => ({ definition, skill: definition.make() }));

    // One record per operation whatever the number of skills naming it.
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
        built.map(({ definition, skill }): McpRegistry.SkillRecord => ({
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
            return yield* Effect.fail(McpRegistry.error(`Operation not found: ${key}`));
          }
          // A named target that does not parse is an error, not a fallback: silently running the
          // call against the invoker's default context is not the space the caller asked for.
          const targetSpaceId = spaceId != null && SpaceId.isValid(spaceId) ? spaceId : undefined;
          if (spaceId != null && targetSpaceId == null) {
            return yield* Effect.fail(McpRegistry.error(`Invalid spaceId: ${spaceId}`));
          }
          // Arguments arrive in wire form (ref envelopes); `invoke` does not decode its input, so
          // the projected schema is applied here, at the boundary where they arrive.
          const decoded = yield* Schema.decodeUnknownEffect(operation.input)(input).pipe(
            Effect.mapError(McpRegistry.error),
          );
          const output = yield* invoker
            .invoke(operation, decoded, targetSpaceId != null ? { spaceId: targetSpaceId } : undefined)
            .pipe(
              Effect.mapError(McpRegistry.error),
              Effect.catchDefect((defect) => Effect.fail(McpRegistry.error(defect))),
            );
          return McpRegistry.snapshot(output);
        }),
    } satisfies McpRegistry.Shape;
  });

/**
 * The projected surface over skill definitions held in this process, requiring only the operation
 * invoker — {@link layer}'s counterpart for a host with no registry to read. Merge the host's
 * transport beneath either.
 */
export const fromSkills = ({
  skills,
  spaceIds,
  reservedToolNames,
  reservedPromptNames,
}: Options): Layer.Layer<never, never, Operation.Service> =>
  layer({ reservedToolNames, reservedPromptNames }).pipe(
    Layer.provide(Layer.effect(McpRegistry.Service, gateway({ skills, spaceIds }))),
  );
