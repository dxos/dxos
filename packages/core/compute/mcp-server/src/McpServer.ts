//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Result from 'effect/Result';
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
import * as scriptInternal from './internal/script.ts';
import * as snapshotInternal from './internal/snapshot.ts';
import * as spaceInternal from './internal/space.ts';
import * as viewInternal from './internal/view.ts';
import * as wireInternal from './internal/wire.ts';

//
// Host contract.
//
// The surface reads operations and skills off an echo registry with the standard query API, but
// when that registry loads is the host's call: the tools resolve it per call through
// `RegistrySource`, and prompts come from whatever registry the host hands `registerPrompts`, at
// layer build or on a running server. The rest is how a chosen operation actually runs and which
// spaces the session may address — the `Host` service. The CLI supplies its live registry and
// in-process invoke (`layer`); EDGE supplies its service binding and the grant's spaces, hydrating
// registries from its RPC records (see {@link hydrateRegistry}) only as far as each request needs.
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

/**
 * Where a session's loaded skills are recorded, which is what {@link invoke} checks an operation's
 * owners against. Host-supplied because a host whose requests land on different processes (EDGE's
 * isolates) needs storage they share; a failure to read or write is the host's to absorb.
 */
export type SkillLedger = {
  /** Prompt names of the skills loaded so far. */
  readonly loaded: Effect.Effect<ReadonlySet<string>>;
  readonly record: (name: string) => Effect.Effect<void>;
};

/** A ledger in this process's memory — right for a host that serves one session per process (stdio). */
export const memorySkillLedger = (): SkillLedger => {
  const loaded = new Set<string>();
  return {
    loaded: Effect.sync(() => loaded),
    record: (name) =>
      Effect.sync(() => {
        loaded.add(name);
      }),
  };
};

export type HostShape = {
  readonly invoke: (request: InvokeRequest) => Effect.Effect<unknown, HostError>;
  /** Omitted, the surface keeps one {@link memorySkillLedger} for as long as it is built. */
  readonly skillLedger?: SkillLedger;
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
    'operation descriptions alone do not carry; invokeOperation refuses such an operation until one ' +
    'of its skills has been loaded in this session. Omit the skill argument to list every skill this ' +
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
          description:
            'Skills this operation belongs to; invokeOperation refuses it until one is loaded with loadSkill.',
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
    'first call; input must match that schema. An operation whose row names skills is refused until ' +
    "one of them has been loaded with loadSkill in this session. Check the operation's mutation class in its row " +
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
        // `description` is spread in only when it resolved, for the reason `operationView` gives:
        // an explicit `undefined` survives encoding and MCP's structured content must be JSON.
        const summarize = (candidate: viewInternal.McpSkill) => ({
          name: candidate.promptName,
          key: candidate.key,
          ...(candidate.description === undefined ? {} : { description: candidate.description }),
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
 * Answers one `loadSkill` call, recording a loaded skill in the ledger so its operations unlock. A
 * listing records nothing, since it carries no instructions.
 */
export const loadSkill = (
  registry: Registry.Registry,
  ledger: SkillLedger,
  skill: string | undefined,
): Effect.Effect<SkillListing, ToolFailure> =>
  loadSkillByName(registry, skill).pipe(
    Effect.tap(({ skills, instructions }) =>
      instructions === undefined || skills.length === 0 ? Effect.void : ledger.record(skills[0].name),
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

  // The published schema says `additionalProperties: false`, and the default `ignore` policy drops
  // an undeclared property instead: a misspelled `text` left `space-query-objects` with no search
  // term at all and its handler answered with the whole space, as a success.
  return Schema.decodeUnknownEffect(codec.decode, { onExcessProperty: 'error', errors: 'all' })(arguments_).pipe(
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
 * Runs an operation the caller has already resolved: encode the input, resolve the space, invoke,
 * qualify refs. Shared by {@link invoke} and {@link invokeHosted}, which differ only in governance.
 */
const dispatch = (
  host: HostShape,
  record: Operation.PersistentOperation,
  operationKey: string,
  { input, spaceId }: { input?: Record<string, unknown>; spaceId?: SpaceId },
): Effect.Effect<Record<string, unknown>, ToolFailure> =>
  Effect.gen(function* () {
    // Encoded before the space is resolved, because the wire form is where a reference argument
    // states which space it belongs to.
    const arguments_ = input ?? {};
    const wire = yield* encodeInput(record, arguments_, operationKey);

    // Only what names a space counts; there is no session default to fall back to.
    const declared = inputInternal.declaresSpaceId(record) ? arguments_.spaceId : undefined;
    const named = spaceId ?? (typeof declared === 'string' ? declared : undefined) ?? spaceInternal.hintFromInput(wire);
    const resolvedSpaceId = yield* spaceInternal.resolveId(host.spaceIds, named, {
      required: viewInternal.requiresSpace(record),
    });

    const output = yield* host
      .invoke({ key: operationKey, input: wire, spaceId: resolvedSpaceId })
      .pipe(Effect.mapError((error) => failure('operation_failed', `${operationKey} failed: ${error.message}`)));

    // `structuredContent` must be a JSON value, so the output travels as the JSON its text block carries.
    const text: string | undefined = yield* Effect.try({
      try: () => JSON.stringify(output),
      catch: (error) =>
        failure('operation_failed', `${operationKey} returned a result that is not JSON: ${String(error)}`),
    });
    if (text === undefined) {
      return {};
    }
    const json: unknown = JSON.parse(text);

    // Nothing to qualify against when the call named no space: a space-less result carries no
    // same-space references.
    const result = resolvedSpaceId === undefined ? json : spaceInternal.qualifyRefs(json, resolvedSpaceId);
    return result !== null && typeof result === 'object' && !Array.isArray(result)
      ? (result as Record<string, unknown>)
      : { output: result };
  });

/**
 * Dispatches one `invokeOperation` call: check a skill governing it was loaded, validate the input,
 * resolve the space, invoke, qualify refs.
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
  loadedSkills: ReadonlySet<string>,
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
      const owners = governedName != null ? viewInternal.ownersOf(skills).get(governedName) : undefined;
      if (record == null || operationKey == null || owners == null) {
        return yield* Effect.fail(
          failure(
            'invalid_request',
            `Unknown operation: '${key}'. Call queryOperations to list the operations this server can run.`,
          ),
        );
      }

      // Refused before any input is examined: the skill is what says how the input should be built.
      if (!owners.some((name) => loadedSkills.has(name))) {
        const options = owners.map((name) => `'${name}'`).join(' or ');
        return yield* Effect.fail(
          failure(
            'skill_not_loaded',
            `${operationKey} belongs to the ${options} skill, which this session has not loaded. ` +
              `Call loadSkill with skill: '${owners[0]}', follow the instructions it returns, then retry this call.`,
          ),
        );
      }

      return yield* dispatch(host, record, operationKey, { input, spaceId });
    }),
  );

/** Answers one `invokeOperation` call against the skills the ledger has recorded. */
export const invokeWithLedger = (
  registry: Registry.Registry,
  host: HostShape,
  ledger: SkillLedger,
  request: { key: string; input?: Record<string, unknown>; spaceId?: SpaceId },
): Effect.Effect<Record<string, unknown>, ToolFailure> =>
  ledger.loaded.pipe(Effect.flatMap((loaded) => invoke(registry, host, request, loaded)));

/**
 * Runs an operation on behalf of a host's own tool, without the skill check {@link invoke} applies.
 *
 * For operations a host tool needs but a model must not call directly (e.g. `file.resolveDownload`,
 * whose result is only useful once the host has signed a URL for it), so no skill lists them.
 */
export const invokeHosted = (
  registry: Registry.Registry,
  host: HostShape,
  { key, input, spaceId }: { key: string; input?: Record<string, unknown>; spaceId?: SpaceId },
): Effect.Effect<Record<string, unknown>, ToolFailure> =>
  catchCollision(
    Effect.gen(function* () {
      const record = viewInternal.lookup(registry, key);
      const operationKey = record != null ? viewInternal.nsid(Operation.getKey(record) ?? '') : undefined;
      if (record == null || operationKey == null) {
        return yield* Effect.fail(failure('operation_failed', `This host does not provide the ${key} operation.`));
      }
      return yield* dispatch(host, record, operationKey, { input, spaceId });
    }),
  );

//
// Code mode.
//
// A task that touches many objects costs one `invokeOperation` round trip per object, each of them
// spent in the client's context. `runScript` lets the caller write that loop once instead: the
// script reaches the same three verbs as functions, through the same skill gate and space rules,
// and only what it prints comes back.
//

export { ScriptError } from './internal/script.ts';

/** Runs a script's code; the host chooses the implementation, which decides how contained the code is. */
export type ScriptSandbox = scriptInternal.Sandbox;

/** In-process evaluation — NOT a security boundary; only for a host whose caller already holds its authority. */
export const inProcessScriptSandbox: ScriptSandbox = scriptInternal.inProcess;

export type ScriptOptions = {
  readonly sandbox: ScriptSandbox;
  /** Bounds one script; what "bounds" means is the sandbox's. */
  readonly timeout?: Duration.Input;
  /** Characters of printed output returned before it is truncated. */
  readonly maxOutput?: number;
};

const DEFAULT_SCRIPT_TIMEOUT = Duration.seconds(60);
const DEFAULT_SCRIPT_MAX_OUTPUT = 16_000;

export const RunScript = Tool.make('runScript', {
  description:
    'Runs a JavaScript script against this server and returns what it printed — use it instead of ' +
    'a chain of invokeOperation calls when a task touches many objects or needs a loop, a filter, ' +
    'or a join. `code` is the body of an async function with these in scope: ' +
    '`await invoke(key, input?, { spaceId }?)` runs an operation exactly as invokeOperation does ' +
    '(same keys, input schemas, skill gate and ref envelopes) and throws on failure; ' +
    '`await queryOperations({ query?, skill?, keys? })` returns the rows queryOperations does; ' +
    '`await loadSkill(name?)` returns what loadSkill does and unlocks its operations; ' +
    '`print(...values)` adds a line to the output (non-strings as JSON); `spaceId` is the spaceId ' +
    'argument, used by invoke when a call names none. Nothing else is in scope: no import, require ' +
    'or fetch. Only printed values reach you — print the fields you need, not whole objects. Look up ' +
    'input schemas with queryOperations before writing code against them.',
  parameters: Schema.Struct({
    code: Schema.String.annotate({ description: 'The async function body. Print anything you need to see.' }),
    spaceId: spaceInternal.idParameter,
  }),
  success: Schema.Struct({
    output: Schema.String.annotate({ description: 'Everything the script printed, in order.' }),
    error: Schema.optional(
      Schema.String.annotate({
        description: 'Why the script failed, when it threw; output holds what it printed first.',
      }),
    ),
  }),
  failure: ToolFailure,
})
  .annotate(Tool.Readonly, false)
  .annotate(Tool.Destructive, true);

/** The fixed surface plus {@link RunScript}, served when a host opts into code mode. */
export const ScriptServerToolkit = Toolkit.make(QueryOperations, InvokeOperation, LoadSkill, RunScript);

/**
 * Answers one `runScript` call: the script's verbs dispatch through {@link invokeWithLedger},
 * {@link queryOperations} and {@link loadSkill}, so a script can do nothing a sequence of tool
 * calls could not.
 */
export const runScript = (
  registry: Registry.Registry,
  host: HostShape,
  ledger: SkillLedger,
  { code, spaceId }: { code: string; spaceId?: SpaceId },
  { sandbox, timeout = DEFAULT_SCRIPT_TIMEOUT, maxOutput = DEFAULT_SCRIPT_MAX_OUTPUT }: ScriptOptions,
): Effect.Effect<{ output: string; error?: string }> =>
  Effect.gen(function* () {
    const services = yield* Effect.context<never>();
    // A tool failure becomes a rejection carrying its message, so the script can catch and read it.
    const run = <A>(effect: Effect.Effect<A, ToolFailure>): Promise<A> =>
      Effect.runPromiseWith(services)(Effect.result(effect)).then((result) =>
        Result.isSuccess(result) ? result.success : Promise.reject(new Error(result.failure.message)),
      );

    const printer = scriptInternal.makePrinter(maxOutput);
    const bindings = {
      spaceId,
      print: printer.print,
      invoke: (key: unknown, input?: unknown, options?: unknown) =>
        run(
          Effect.gen(function* () {
            const request = yield* scriptRequest(key, input, options);
            return yield* invokeWithLedger(registry, host, ledger, {
              ...request,
              spaceId: request.spaceId ?? spaceId,
            });
          }),
        ),
      queryOperations: (query?: unknown) =>
        run(
          Schema.decodeUnknownEffect(QueryOperations.parametersSchema)(query ?? {}).pipe(
            Effect.mapError((error) => failure('invalid_request', `queryOperations: ${String(error)}`)),
            Effect.flatMap((params) => queryOperations(registry, params)),
            Effect.map(({ operations }) => operations),
          ),
        ),
      loadSkill: (skill?: unknown) =>
        run(
          skill === undefined || typeof skill === 'string'
            ? loadSkill(registry, ledger, skill)
            : Effect.fail(failure('invalid_request', 'loadSkill takes a skill name.')),
        ),
    };

    const result = yield* sandbox.evaluate({ code, bindings, timeout }).pipe(Effect.result);
    if (Result.isFailure(result)) {
      log.info('mcp script failed', { message: result.failure.message });
      return { output: printer.output(), error: result.failure.message };
    }
    // A script that printed nothing but returned a value would otherwise answer with nothing.
    if (result.success !== undefined && printer.isEmpty()) {
      printer.print(result.success);
    }
    return { output: printer.output() };
  });

const ScriptInvokeArguments = Schema.Struct({
  key: Schema.String,
  input: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
  options: Schema.optional(Schema.Struct({ spaceId: Schema.optional(SpaceId) })),
});

/** Validates `invoke`'s positional arguments, which arrive untyped from the script. */
const scriptRequest = (
  key: unknown,
  input: unknown,
  options: unknown,
): Effect.Effect<{ key: string; input?: Record<string, unknown>; spaceId?: SpaceId }, ToolFailure> =>
  Schema.decodeUnknownEffect(ScriptInvokeArguments)({ key, input, options }).pipe(
    Effect.map((decoded) => ({ key: decoded.key, input: decoded.input, spaceId: decoded.options?.spaceId })),
    Effect.mapError((error) =>
      failure('invalid_request', `invoke(key, input?, { spaceId }?) was called wrongly: ${String(error)}`),
    ),
  );

//
// Downloads.
//
// The reverse of each host's `createUpload`: a file in a space becomes a short-lived URL an agent's
// shell fetches, so its bytes reach disk without passing through the model. The tool is declared
// here, once, because both hosts must describe it identically; each signs URLs its own way.
//

/** Key of the host-internal operation that names a file's bytes to the host. */
export const RESOLVE_DOWNLOAD_KEY = 'org.dxos.operation.file.resolveDownload';

/** What `file.resolveDownload` returns: an id only its host can sign, plus what the caller is told. */
const ResolvedDownload = Schema.Struct({
  downloadId: Schema.String,
  name: Schema.optional(Schema.String),
  type: Schema.String,
  size: Schema.Number,
});
export type ResolvedDownload = Schema.Schema.Type<typeof ResolvedDownload>;

export const CreateDownload = Tool.make('createDownload', {
  description:
    'Returns a short-lived URL for downloading a file object from a space straight to local disk, ' +
    'bypassing the conversation entirely. Use this to save a file (an image, recording, PDF, log) ' +
    'to disk; run the returned command in a shell. To look at a file yourself instead, read it with ' +
    'the file.read operation. The URL expires in minutes: get it, use it, and do not save it for later.',
  parameters: Schema.Struct({
    file: Schema.Struct({ '/': Schema.String }).annotate({
      description: 'Reference to the file object, exactly as another tool returned it.',
    }),
    spaceId: spaceInternal.idParameter,
  }),
  failure: ToolFailure,
  success: Schema.Struct({
    url: Schema.String,
    method: Schema.Literal('GET'),
    expiresAt: Schema.String.annotate({ description: 'ISO 8601 instant after which the URL is refused.' }),
    name: Schema.String.annotate({ description: 'File name the command saves to.' }),
    type: Schema.String,
    size: Schema.Number,
    command: Schema.String.annotate({ description: 'Ready-to-run download command.' }),
  }),
})
  // Mints a credential and writes nothing to the space.
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false);

export const DownloadToolkit = Toolkit.make(CreateDownload);

/** Resolves a file reference through the host to the id the host signs a download URL for. */
export const resolveDownload = (
  registry: Registry.Registry,
  host: HostShape,
  { file, spaceId }: { file: { '/': string }; spaceId?: string },
): Effect.Effect<ResolvedDownload, ToolFailure> =>
  Effect.gen(function* () {
    const resolvedSpaceId = yield* spaceInternal.resolveId(
      host.spaceIds,
      spaceId ?? spaceInternal.hintFromInput(file),
      {
        required: true,
      },
    );
    const output = yield* invokeHosted(registry, host, {
      key: RESOLVE_DOWNLOAD_KEY,
      input: { file },
      spaceId: resolvedSpaceId,
    });
    return yield* Schema.decodeUnknownEffect(ResolvedDownload)(output).pipe(
      Effect.mapError((error) =>
        failure('operation_failed', `${RESOLVE_DOWNLOAD_KEY} returned an unexpected result: ${String(error)}`),
      ),
    );
  });

/** The file name a download is saved under: a bare name, so the command never writes outside the working directory. */
export const downloadFileName = ({ name, downloadId }: ResolvedDownload): string => {
  const base = (name ?? '').split(/[\\/]/).pop()?.replace(/^\.+/, '') ?? '';
  return base.length > 0 ? base : `download-${downloadId.slice(0, 12)}`;
};

/** Single-quotes a word for a POSIX shell, so a name with spaces, quotes or `$` stays one argument. */
export const shellQuote = (word: string): string => `'${word.replaceAll("'", `'\\''`)}'`;

/**
 * `--fail` rather than the upload's `--fail-with-body`: with `-o`, the latter saves the error page
 * as the file, which a caller then reads as the download.
 */
export const downloadCommand = (url: string, name: string): string =>
  `curl --fail -sS -o ${shellQuote(`./${name}`)} ${shellQuote(url)}`;

//
// Layers.
//

export type LayerOptions = {
  /** Names of the host's statically-defined tools; none may be one of {@link TOOL_NAMES}. */
  readonly reservedToolNames?: readonly string[];
  /** Names of the host's statically-defined prompts; a projected skill may not claim one. */
  readonly reservedPromptNames?: readonly string[];
  /** Serves {@link RunScript} as well, evaluating in this sandbox; omitted, code mode is off. */
  readonly script?: ScriptOptions;
};

export type RegistrySourceShape = {
  /**
   * The registry one tool call reads. Resolved per call rather than at layer build, so the host
   * decides when operations load and how long they are kept — a host whose registry sits behind an
   * RPC (EDGE) must not pay for it on requests that list tools and never call one.
   */
  readonly registry: Effect.Effect<Registry.Registry, ToolFailure>;
};

/** Where the tool handlers get the registry; see {@link RegistrySourceShape}. */
export class RegistrySource extends Context.Service<RegistrySource, RegistrySourceShape>()(
  '@dxos/mcp-server/RegistrySource',
) {}

/** A {@link RegistrySource} over echo's {@link Registry.Service}, for a host holding a live registry. */
export const registrySourceLayer: Layer.Layer<RegistrySource, never, Registry.Service> = Layer.effect(
  RegistrySource,
  Effect.map(Registry.Service, (registry) => RegistrySource.of({ registry: Effect.succeed(registry) })),
);

/**
 * The fixed tool surface — `queryOperations` / `invokeOperation` / `loadSkill` — reading the
 * registry from {@link RegistrySource} and dispatching through {@link Host} per call. Building it
 * touches neither, so `tools/list` is served without the registry.
 */
export const toolsLayer = ({
  reservedToolNames = [],
  script,
}: Pick<LayerOptions, 'reservedToolNames' | 'script'> = {}): Layer.Layer<never, never, RegistrySource | Host> =>
  Effect.gen(function* () {
    const ownNames: readonly string[] = [...TOOL_NAMES, RunScript.name];
    const claimed = reservedToolNames.filter((name) => ownNames.includes(name));
    if (claimed.length > 0) {
      // Loud at layer build: a host static tool of the same name would shadow this package's,
      // leaving the server advertising one tool and dispatching the other.
      throw new Error(`MCP tool name collision: the host reserves names this server defines: ${claimed.join(', ')}.`);
    }
    const handlers = Effect.gen(function* () {
      const source = yield* RegistrySource;
      const host = yield* Host;
      // One ledger for every tool, so a skill loaded by `loadSkill` unlocks its operations in a script too.
      const ledger = host.skillLedger ?? memorySkillLedger();
      return {
        source,
        host,
        ledger,
        handlers: {
          queryOperations: (query: Parameters<typeof queryOperations>[1]) =>
            Effect.flatMap(source.registry, (registry) => queryOperations(registry, query)),
          invokeOperation: (request: { key: string; input?: Record<string, unknown>; spaceId?: SpaceId }) =>
            Effect.flatMap(source.registry, (registry) => invokeWithLedger(registry, host, ledger, request)),
          loadSkill: ({ skill }: { skill?: string }) =>
            Effect.flatMap(source.registry, (registry) => loadSkill(registry, ledger, skill)),
        },
      };
    });
    if (script == null) {
      return McpServer$.toolkit(ServerToolkit).pipe(
        Layer.provide(ServerToolkit.toLayer(Effect.map(handlers, ({ handlers }) => ServerToolkit.of(handlers)))),
      );
    }
    return McpServer$.toolkit(ScriptServerToolkit).pipe(
      Layer.provide(
        ScriptServerToolkit.toLayer(
          Effect.map(handlers, ({ source, host, ledger, handlers }) =>
            ScriptServerToolkit.of({
              ...handlers,
              runScript: (request) =>
                Effect.flatMap(source.registry, (registry) => runScript(registry, host, ledger, request, script)),
            }),
          ),
        ),
      ),
    );
  }).pipe(Layer.unwrap);

/**
 * Registers the opted-in skills of `registry` as prompts on an already-running server. Needs skills
 * only, never operations. Effect's `McpServer` can add prompts at runtime (and tells subscribers the
 * list changed) but cannot remove them, so a skill dropped from the registry stays until the server
 * is rebuilt. A prompt-name collision dies here, as the authorship error it is.
 */
export const registerPrompts = (
  registry: Registry.Registry,
  { reservedPromptNames = [] }: Pick<LayerOptions, 'reservedPromptNames'> = {},
): Effect.Effect<void, never, McpServer$.McpServer> =>
  viewInternal.mcpSkills(registry, reservedPromptNames).pipe(
    Effect.flatMap((skills) =>
      Effect.forEach(
        skills,
        (candidate) =>
          McpServer$.registerPrompt({
            name: candidate.promptName,
            description: candidate.description,
            parameters: {},
            content: () => Effect.succeed(candidate.instructions),
          }),
        { discard: true },
      ),
    ),
  );

/**
 * {@link registerPrompts} at layer build, for a host that has its skills before it serves anything.
 * A host that fetches skills should keep them off the handshake and call {@link registerPrompts}
 * when a prompt request first arrives instead.
 */
export const promptsLayer = (
  registry: Registry.Registry,
  options: Pick<LayerOptions, 'reservedPromptNames'> = {},
): Layer.Layer<never> =>
  Layer.effectDiscard(registerPrompts(registry, options)).pipe(Layer.provide(McpServer$.McpServer.layer));

/**
 * The whole projected surface built eagerly over a live {@link Registry.Service} — {@link toolsLayer}
 * plus {@link promptsLayer} — for a host that holds its registry in process (the CLI, tests). A host
 * that has to fetch its registry composes the two itself, choosing when each part loads.
 */
export const layer = ({ reservedToolNames, reservedPromptNames, script }: LayerOptions = {}): Layer.Layer<
  never,
  never,
  Registry.Service | Host
> =>
  Layer.mergeAll(
    toolsLayer({ reservedToolNames, script }).pipe(Layer.provide(registrySourceLayer)),
    Effect.map(Registry.Service, (registry) => promptsLayer(registry, { reservedPromptNames })).pipe(Layer.unwrap),
  );

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

export type NormalizeResponseOptions = {
  readonly serverInfo?: Record<string, unknown>;
  /** An event stream is collapsed only when this is a POST other than `subscriptions/listen`, whose stream never ends. */
  readonly request?: Pick<Request, 'method' | 'headers'>;
};

/**
 * The same passes over an HTTP response body, for a host that owns its own transport (effect's
 * `McpServer.layerHttp` behind a worker's fetch handler).
 *
 * `serverInfo` is merged into the server's `Implementation` wherever a result names it, on top of the
 * shared identity: the MCP `Implementation` may carry `title`, `websiteUrl` and `icons`, and effect's
 * `McpServer` offers no way to supply them. Pass `icons` here — they need an origin, which only the
 * host knows.
 *
 * A finite event stream collapses to its lone response, since effect streams any reply carrying a
 * stray `list_changed`.
 */
export const normalizeResponse = async (
  response: Response,
  { request, ...options }: NormalizeResponseOptions = {},
): Promise<Response> => {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('text/event-stream')) {
    const finite = request?.method === 'POST' && request.headers.get('mcp-method') !== 'subscriptions/listen';
    return finite ? collapseEventStream(response, options) : response;
  }
  if (!contentType.includes('application/json')) {
    return response;
  }
  const text = await response.text();
  return withBody(response, wireInternal.normalizeText(text, options) ?? text);
};

/** Passes the stream through unchanged when it holds anything but notifications and one response. */
const collapseEventStream = async (
  response: Response,
  options: Pick<NormalizeResponseOptions, 'serverInfo'>,
): Promise<Response> => {
  const bytes = await response.arrayBuffer();
  const unchanged = new Response(bytes, response);
  const events = eventData(new TextDecoder().decode(bytes));
  if (events == null) {
    return unchanged;
  }

  const responses: string[] = [];
  for (const data of events) {
    const kind = messageKind(data);
    if (kind === 'response') {
      responses.push(data);
    } else if (kind !== 'notification') {
      return unchanged;
    }
  }

  if (responses.length > 1) {
    return unchanged;
  }
  if (responses.length === 0) {
    return withBody(response, null, 202);
  }
  const [data] = responses;
  return withBody(response, wireInternal.normalizeText(data, options) ?? data, response.status, 'application/json');
};

/** The `data` of each server-sent event, or `undefined` when the stream ends mid-event. */
const eventData = (text: string): string[] | undefined => {
  const events: string[] = [];
  let data: string[] = [];
  for (const line of text.split(/\r\n|\r|\n/)) {
    if (line === '') {
      if (data.length > 0) {
        events.push(data.join('\n'));
        data = [];
      }
      continue;
    }
    const colon = line.indexOf(':');
    const field = colon < 0 ? line : line.slice(0, colon);
    if (field === 'data') {
      data.push(colon < 0 ? '' : line.slice(colon + 1).replace(/^ /, ''));
    }
  }
  return data.length > 0 ? undefined : events;
};

const messageKind = (data: string): 'response' | 'notification' | undefined => {
  let message: unknown;
  try {
    message = JSON.parse(data);
  } catch {
    return undefined;
  }
  if (message === null || typeof message !== 'object' || Array.isArray(message)) {
    return undefined;
  }
  if ('method' in message) {
    return 'id' in message ? undefined : 'notification';
  }
  // Exactly one outcome: a message carrying both is malformed, and the stream is left alone.
  return 'id' in message && 'result' in message !== 'error' in message ? 'response' : undefined;
};

/** Rebuilds a response around a new body, which no upstream `Content-Length` describes. */
const withBody = (
  response: Response,
  body: string | null,
  status = response.status,
  contentType?: string,
): Response => {
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  if (body == null) {
    headers.delete('content-type');
  } else if (contentType != null) {
    headers.set('content-type', contentType);
  }
  return new Response(body, { status, headers });
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
export const ICON_PATH = iconInternal.ICON_PATH;
export const FAVICON_PATH = iconInternal.FAVICON_PATH;

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
