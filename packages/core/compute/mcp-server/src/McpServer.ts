//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
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
import * as Template from '@dxos/compute/Template';
import { Obj, Registry } from '@dxos/echo';
import { makeRegistry } from '@dxos/echo-client';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

export { ToolFailure, type ToolFailureCode, failure } from './internal/failure.ts';
import { ToolFailure, failure } from './internal/failure.ts';
import * as iconInternal from './internal/icon.ts';
import * as identityInternal from './internal/identity.ts';
import * as inputInternal from './internal/input.ts';
import * as snapshotInternal from './internal/snapshot.ts';
import * as spaceInternal from './internal/space.ts';
import * as viewInternal from './internal/view.ts';
import * as wireInternal from './internal/wire.ts';

//
// Host contract.
//
// The registry needs no wrapper: the surface reads operations and skills straight off echo's
// `Registry.Service` with the standard query API. What remains host-specific is how a chosen
// operation actually runs and which spaces the session may address — the `Host` service, and
// nothing else. The CLI supplies its in-process invoke; EDGE supplies its service binding and the
// grant's spaces, hydrating a registry from its RPC records (see {@link hydrateRegistry}).
//

/** Failure of the host's invoke seam — an outage or handler fault, not an authorship error. */
export class HostError extends Schema.TaggedError<HostError>('McpHostError')('McpHostError', {
  message: Schema.String,
}) {}

/** Builds a {@link HostError} from anything thrown, so hosts do not each unwrap causes their own way. */
export const hostError = (cause: unknown): HostError =>
  new HostError({ message: cause instanceof Error ? cause.message : String(cause) });

export type InvokeRequest = {
  /** Operation key without the `dxn:` prefix. */
  readonly key: string;
  readonly input?: unknown;
  readonly spaceId?: string;
};

export type HostShape = {
  readonly invoke: (request: InvokeRequest) => Effect.Effect<unknown, HostError>;
  /**
   * Spaces this session may address. No member is a default: a call that names none is refused.
   * Omitted is unrestricted; empty is a host that enumerated and found none, refusing every call.
   */
  readonly spaceIds?: readonly string[];
};

export class Host extends Context.Service<Host, HostShape>()('@dxos/mcp-server/Host') {}

/**
 * Replaces live ECHO entities in an operation's result with wire snapshots — what every host's
 * invoke must return. An operation returning a live object is right in-process, but a proxy
 * carries none of its properties through JSON.
 */
export const snapshot = snapshotInternal.entities;

//
// The fixed tool surface.
//

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
 * settles.
 */
export const LoadSkill = Tool.make('loadSkill', {
  description:
    'Loads a skill: the instructions for a multi-tool workflow hosted on this server. Call this ' +
    'before first invoking any operation whose queryOperations row names a skill, and follow the ' +
    'returned instructions — they define required setup, argument conventions, and ordering that ' +
    'operation descriptions alone do not carry. Omit the skill argument to list every skill this ' +
    'server offers. The same skills are exposed to users as prompts; loading one here brings the ' +
    'identical text into context without user action. No side effects.',
  parameters: Schema.Struct({
    skill: Schema.optional(
      Schema.String.annotate({
        description:
          "Skill name as given in a queryOperations row or the prompt listing (e.g. 'project'). " +
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
export const QueryOperations = Tool.make('queryOperations', {
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
      Schema.String.annotate({ description: "Only operations belonging to this skill (e.g. 'project')." }),
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
          description: 'Skills this operation belongs to; load one with loadSkill before invoking.',
        }),
        requiresSpace: Schema.Boolean.annotate({
          description: 'Whether the operation acts on a space, making invokeOperation spaceId load-bearing.',
        }),
        hints: Schema.Struct({
          mutation: Schema.optional(
            Schema.String.annotate({
              description: "Effect on state: 'none' reads, 'write' creates or updates, 'destructive' deletes.",
            }),
          ),
          idempotent: Schema.optional(Schema.Boolean),
        }),
        schema: Schema.optional(
          Schema.Struct({
            input: Schema.optional(Schema.Unknown),
            output: Schema.optional(Schema.Unknown),
          }).annotate({
            description: "The operation's input and output JSON Schemas; returned for a keys lookup only.",
          }),
        ),
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
 * `queryOperations` row.
 */
export const InvokeOperation = Tool.make('invokeOperation', {
  description:
    'Invokes an operation by key — how every read and write on this server is performed. Find the ' +
    'key with queryOperations and fetch its input schema (queryOperations with keys) before the ' +
    "first call; input must match that schema. Check the operation's mutation class in its row " +
    'before invoking: this tool is as destructive as whatever it is asked to run. References ' +
    'between objects travel as {"/": "echo://<spaceId>/<objectId>"} envelopes — pass them back ' +
    'exactly as received.',
  parameters: Schema.Struct({
    key: Schema.String.annotate({ description: 'Operation key, exactly as queryOperations reported it.' }),
    input: Schema.optional(
      Schema.Record(Schema.String, Schema.Unknown).annotate({
        description: "The operation's arguments, matching the input schema queryOperations returned for this key.",
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
export const ServerToolkit = Toolkit.make(QueryOperations, InvokeOperation, LoadSkill);

/** Names this package claims; a host's static toolkit may not take one. */
export const TOOL_NAMES = [QueryOperations.name, InvokeOperation.name, LoadSkill.name] as const;

//
// Handlers.
//

export type SkillListing = {
  skills: readonly { name: string; key: string; description?: string }[];
  instructions?: string;
};

/** A prompt-name collision throws as a defect; inside a request it is the call's failure instead. */
const catchCollision = <A>(effect: Effect.Effect<A, ToolFailure>): Effect.Effect<A, ToolFailure> =>
  Effect.catchDefect(effect, (defect) => Effect.fail(failure('operation_failed', String(defect))));

/**
 * Resolves a skill by prompt name (or full registry key) to the body `loadSkill` returns; with no
 * name, lists them all.
 */
export const loadSkillByName = (
  registry: Registry.Registry,
  skill: string | undefined,
): Effect.Effect<SkillListing, ToolFailure> =>
  catchCollision(
    viewInternal.mcpSkills(registry).pipe(
      Effect.flatMap((projected) => {
        const summarize = (candidate: viewInternal.McpSkill) => ({
          name: candidate.promptName,
          key: candidate.key,
          description: candidate.description,
        });
        if (skill == null) {
          return Effect.succeed<SkillListing>({ skills: projected.map(summarize) });
        }
        const requested = viewInternal.nsid(skill);
        const match = projected.find((candidate) => candidate.promptName === requested || candidate.key === requested);
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
    ),
  );

/**
 * Answers one `queryOperations` call from the registry. The query runs live rather than against a
 * capture, so an operation registered after startup is findable without a rebuild.
 */
export const queryOperations = (
  registry: Registry.Registry,
  { query, skill, keys }: { query?: string; skill?: string; keys?: readonly string[] },
): Effect.Effect<{ operations: viewInternal.OperationView[] }, ToolFailure> =>
  catchCollision(
    viewInternal.mcpSkills(registry).pipe(
      Effect.flatMap((skills) => {
        const owners = viewInternal.ownersOf(skills);
        if (keys != null && keys.length > 0) {
          // Named keys are a lookup rather than a search: the caller has chosen, and what it needs
          // back is the schema it must write against. An unknown key contributes nothing instead of
          // failing the call — `invokeOperation` is where a wrong key gets an actionable error.
          const operations = keys.flatMap((key) => {
            const record = viewInternal.lookup(registry, key);
            if (record == null) {
              return [];
            }
            const toolName = viewInternal.toolNameOf(record);
            return toolName != null && owners.has(toolName) ? [viewInternal.operationView(record, owners, true)] : [];
          });
          return Effect.succeed({ operations });
        }
        return viewInternal.findRecords(registry, query).pipe(
          Effect.map((records) => ({
            operations: records
              .filter((record) => {
                const recordToolName = viewInternal.toolNameOf(record);
                const ownersOfRecord = recordToolName == null ? undefined : owners.get(recordToolName);
                if (ownersOfRecord == null) {
                  return false;
                }
                return skill == null || ownersOfRecord.some((name) => name.toLowerCase() === skill.toLowerCase());
              })
              .map((record) => viewInternal.operationView(record, owners, false)),
          })),
        );
      }),
    ),
  );

/** Re-encodes the arguments through the operation's own codec, so the handler sees its wire form. */
const encodeInput = (
  record: Operation.PersistentOperation,
  arguments_: Record<string, unknown>,
  operationKey: string,
): Effect.Effect<unknown, ToolFailure> => {
  const codec = inputInternal.codec(record);
  if (codec == null) {
    return Effect.succeed(arguments_);
  }

  return Schema.decodeUnknownEffect(codec.decode)(arguments_).pipe(
    Effect.flatMap(Schema.encodeUnknownEffect(codec.encode)),
    Effect.mapError((error) =>
      failure(
        'invalid_request',
        `${operationKey} input did not match its schema: ${String(error)}. Call queryOperations ` +
          `with keys: ['${operationKey}'] for the schema it expects.`,
      ),
    ),
  );
};

/**
 * Dispatches one `invokeOperation` call: validate the input, resolve the space, invoke, qualify refs.
 *
 * The input arrives as raw JSON rather than through a per-operation tool schema, so validating it
 * here is what turns a malformed call into an error naming the offending field instead of a
 * failure from somewhere inside the handler. Outputs are objects by upstream convention; a
 * non-object output is wrapped as `{ output }` because MCP requires `structuredContent` to be a
 * JSON object.
 */
export const invoke = (
  registry: Registry.Registry,
  host: HostShape,
  { key, input, spaceId }: { key: string; input?: Record<string, unknown>; spaceId?: SpaceId },
): Effect.Effect<Record<string, unknown>, ToolFailure> =>
  catchCollision(
    Effect.gen(function* () {
      const skills = yield* viewInternal.mcpSkills(registry);
      const record = viewInternal.lookup(registry, key);
      const operationKey = record != null ? viewInternal.nsid(Operation.getKey(record) ?? '') : undefined;
      // Governance is keyed by the derived tool name, the form a skill's `tools` list carries; the
      // operation is still invoked by key below.
      const governedName = record != null ? viewInternal.toolNameOf(record) : undefined;
      // Skills are the unit of governance: an operation in the registry but named by no opted-in
      // skill is exactly as uninvocable as one that does not exist.
      if (
        record == null ||
        operationKey == null ||
        governedName == null ||
        !viewInternal.ownersOf(skills).has(governedName)
      ) {
        return yield* Effect.fail(
          failure(
            'invalid_request',
            `Unknown operation: '${key}'. Call queryOperations to list the operations this server can run.`,
          ),
        );
      }

      // Encoded before the space is resolved, because the wire form is where a reference argument
      // states which space it belongs to.
      const arguments_ = input ?? {};
      const wire = yield* encodeInput(record, arguments_, operationKey);

      // Only what names a space counts; there is no session default to fall back to.
      const declared = inputInternal.declaresSpaceId(record) ? arguments_.spaceId : undefined;
      const named =
        spaceId ?? (typeof declared === 'string' ? declared : undefined) ?? spaceInternal.hintFromInput(wire);
      const resolvedSpaceId = yield* spaceInternal.resolveId(host.spaceIds, named, {
        required: viewInternal.requiresSpace(record),
      });

      const output = yield* host
        .invoke({ key: operationKey, input: wire, spaceId: resolvedSpaceId })
        .pipe(Effect.mapError((error) => failure('operation_failed', `${operationKey} failed: ${error.message}`)));

      // Nothing to qualify against when the call named no space: a space-less result carries no
      // same-space references.
      const result = resolvedSpaceId === undefined ? output : spaceInternal.qualifyRefs(output, resolvedSpaceId);
      return result !== null && typeof result === 'object' && !Array.isArray(result)
        ? (result as Record<string, unknown>)
        : { output: result };
    }),
  );

//
// Layers.
//

export type LayerOptions = {
  /** Names of the host's statically-defined tools; none may be one of {@link TOOL_NAMES}. */
  readonly reservedToolNames?: readonly string[];
  /** Names of the host's statically-defined prompts; a projected skill may not claim one. */
  readonly reservedPromptNames?: readonly string[];
};

/** The fixed tool surface, reading the registry and dispatching through the host per call. */
const surfaceLayer: Layer.Layer<never, never, Registry.Service | Host> = McpServer$.toolkit(ServerToolkit).pipe(
  Layer.provide(
    ServerToolkit.toLayer(
      Effect.gen(function* () {
        const registry = yield* Registry.Service;
        const host = yield* Host;
        return ServerToolkit.of({
          queryOperations: (query) => queryOperations(registry, query),
          invokeOperation: (request) => invoke(registry, host, request),
          loadSkill: ({ skill }) => loadSkillByName(registry, skill),
        });
      }),
    ),
  ),
);

/**
 * Builds the prompt layers for opted-in skills. Prompts are captured at layer build — effect's
 * `McpServer` has no tool/prompt removal, so the prompt list cannot follow the registry live the
 * way the tool handlers do.
 */
export const promptsLayer = (skills: readonly viewInternal.McpSkill[]): Layer.Layer<never> =>
  Layer.mergeAll(
    Layer.empty,
    ...skills.map((candidate) =>
      McpServer$.prompt({
        name: candidate.promptName,
        description: candidate.description,
        parameters: {},
        content: () => Effect.succeed(candidate.instructions),
      }),
    ),
  );

/**
 * The whole projected surface — `queryOperations` / `invokeOperation` / `loadSkill` over the
 * operations opted-in skills name, plus those skills as prompts. Hosts provide echo's
 * {@link Registry.Service} (holding `PersistentOperation` and `Skill` entities) and {@link Host},
 * merge their own static toolkits alongside, and declare those names as reserved.
 */
export const layer = ({ reservedToolNames = [], reservedPromptNames = [] }: LayerOptions = {}): Layer.Layer<
  never,
  never,
  Registry.Service | Host
> =>
  Effect.gen(function* () {
    const claimed = reservedToolNames.filter((name) => (TOOL_NAMES as readonly string[]).includes(name));
    if (claimed.length > 0) {
      // Loud at layer build: a host static tool of the same name would shadow this package's,
      // leaving the server advertising one tool and dispatching the other.
      throw new Error(`MCP tool name collision: the host reserves names this server defines: ${claimed.join(', ')}.`);
    }
    const registry = yield* Registry.Service;
    // A collision throws as a defect here, at layer build — an authorship error, surfaced loudly.
    const skills = yield* viewInternal.mcpSkills(registry, reservedPromptNames);
    return Layer.mergeAll(surfaceLayer, promptsLayer(skills));
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
// A host that still hand-writes a verb (EDGE's object/space toolkits, until the registry covers
// them) needs the conventions the surface follows, or the two disagree about which space a call
// targets.
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
// Registry construction for hosts without one.
//

/** A skill in the flattened form a host fetched over RPC, its instructions text materialized. */
export type HydratedSkill = {
  readonly key: string;
  readonly name?: string;
  readonly description?: string;
  /** Whether the skill opted into MCP projection (`Skill.McpPromptAnnotation`). */
  readonly mcpPrompt?: boolean;
  /** The skill's tool ids (operation NSIDs) — what decides which operations project. */
  readonly tools?: readonly string[];
  /**
   * The instructions text, resolved before crossing the wire: a detached skill holds it in a
   * ref-embedded `Text`, and a ref serialized over RPC is a pointer nothing can resolve.
   */
  readonly instructions?: string;
};

/**
 * Builds a registry from records fetched over a wire — `Obj.toJSON` operation records and
 * flattened skills — for a host (EDGE) whose registry lives behind an RPC binding and cannot be
 * handed over live. An in-process host wires its own registry instead.
 */
export const hydrateRegistry = ({
  operations = [],
  skills = [],
}: {
  operations?: readonly unknown[];
  skills?: readonly HydratedSkill[];
}): Effect.Effect<Registry.Registry> =>
  Effect.promise(async () => {
    const records = await Promise.all(operations.map((json) => Obj.fromJSON(json)));
    const built = skills.flatMap((record) => {
      // Refused here rather than dropped later by the projection, so the omission is attributable
      // to the host's marshalling.
      if (record.mcpPrompt && (record.instructions == null || record.instructions.length === 0)) {
        log.error('hydrated skill has no instructions; it and its operations are not served', {
          key: record.key,
          tools: record.tools,
        });
        return [];
      }
      return [
        Skill.make({
          key: record.key,
          name: record.name ?? viewInternal.nsid(record.key).split('.').at(-1) ?? record.key,
          description: record.description,
          mcpPrompt: record.mcpPrompt,
          tools: Skill.toolDefinitions({ operations: [], tools: record.tools ?? [] }),
          instructions: Template.make({ source: record.instructions ?? '' }),
        }),
      ];
    });
    return makeRegistry({ initial: [...records, ...built] });
  });

//
// Skill-backed surface: definitions held in process, rather than a host-wired registry.
//

export type Options = {
  /**
   * Skill definitions to serve. Each must carry `operations` (the definitions behind its ToolIds)
   * for its tools to project — there is no other registry to resolve them against — and only
   * skills whose built object opts in via `mcpPrompt` project at all.
   */
  skills: readonly Skill.Definition[];
  /**
   * Spaces the session may address. No member is a default: a call that names none is refused.
   * Omitted (the default) means unrestricted — the invoker's own database context decides.
   */
  spaceIds?: readonly string[];
  /** Names of the host's statically-defined tools; none may be one of {@link TOOL_NAMES}. */
  reservedToolNames?: readonly string[];
  /** Names of the host's statically-defined prompts; a projected skill may not claim one. */
  reservedPromptNames?: readonly string[];
};

/**
 * A {@link Host} over the definitions' live operations: input decoded against the live schema,
 * invocation through the ambient `Operation.Service` with the target space as `InvokeOptions.spaceId`.
 */
export const host = ({
  skills,
  spaceIds,
}: Pick<Options, 'skills' | 'spaceIds'>): Effect.Effect<HostShape, never, Operation.Service> =>
  Effect.gen(function* () {
    const invoker = yield* Operation.Service;
    // One definition per operation whatever the number of skills naming it.
    const operations = new Map<string, Operation.Definition.Any>();
    for (const definition of skills) {
      for (const operation of definition.operations ?? []) {
        operations.set(viewInternal.nsid(String(operation.meta.key)), operation);
      }
    }
    return {
      spaceIds,
      invoke: ({ key, input, spaceId }) =>
        Effect.gen(function* () {
          const operation = operations.get(viewInternal.nsid(key));
          if (!operation) {
            return yield* Effect.fail(hostError(`Operation not found: ${key}`));
          }
          // A named target that does not parse is an error, not a fallback: silently running the
          // call against the invoker's default context is not the space the caller asked for.
          const targetSpaceId = spaceId != null && SpaceId.isValid(spaceId) ? spaceId : undefined;
          if (spaceId != null && targetSpaceId == null) {
            return yield* Effect.fail(hostError(`Invalid spaceId: ${spaceId}`));
          }
          // Arguments arrive in wire form (ref envelopes); `invoke` does not decode its input, so
          // the definition's schema is applied here, at the boundary where they arrive.
          const decoded = yield* Schema.decodeUnknownEffect(operation.input)(input).pipe(Effect.mapError(hostError));
          const output = yield* invoker
            .invoke(operation, decoded, targetSpaceId != null ? { spaceId: targetSpaceId } : undefined)
            .pipe(
              Effect.mapError(hostError),
              Effect.catchDefect((defect) => Effect.fail(hostError(defect))),
            );
          return snapshot(output);
        }),
    } satisfies HostShape;
  });

/**
 * The projected surface over skill definitions held in this process, requiring only the operation
 * invoker — {@link layer}'s counterpart for a host with no registry of its own (tests, embedded
 * servers). Real hosts wire {@link layer} to their process's registry instead. Merge the host's
 * transport beneath either.
 */
export const fromSkills = ({
  skills,
  spaceIds,
  reservedToolNames,
  reservedPromptNames,
}: Options): Layer.Layer<never, never, Operation.Service> =>
  layer({ reservedToolNames, reservedPromptNames }).pipe(
    Layer.provide(
      Layer.mergeAll(
        Layer.sync(Registry.Service, () =>
          makeRegistry({
            initial: [
              ...Operation.serializable(skills.flatMap((definition) => definition.operations ?? [])),
              ...skills.map((definition) => definition.make()),
            ],
          }),
        ),
        Layer.effect(Host, host({ skills, spaceIds })),
      ),
    ),
  );
