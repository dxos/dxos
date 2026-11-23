//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as McpSchema from 'effect/ai/McpSchema';
import * as McpServer$ from 'effect/ai/McpServer';
import * as Tool from 'effect/ai/Tool';
import * as Toolkit from 'effect/ai/Toolkit';
import * as Context from 'effect/Context';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as Sink from 'effect/Sink';
import * as EffectStdio from 'effect/Stdio';

import {
  Runner as CodeModeRunner,
  EFFECT_API,
  EffectDialect,
  type Sandbox,
  type SandboxOperation,
} from '@dxos/agent-code-mode';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { Annotation, Database, Obj, Registry } from '@dxos/echo';
import { makeRegistry } from '@dxos/echo-client';
import * as EffectEx from '@dxos/effect/EffectEx';
import { DXN, SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { trim } from '@dxos/util';

export { ToolFailure, type ToolFailureCode, failure } from './internal/failure.ts';
import { ToolFailure, failure } from './internal/failure.ts';
import * as iconInternal from './internal/icon.ts';
import * as identityInternal from './internal/identity.ts';
import * as inputInternal from './internal/input.ts';
import * as skillTokenInternal from './internal/skill-token.ts';
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
 * Decides whether an `invokeOperation` call shows it read a skill governing the operation. Stateless
 * on purpose: MCP 2026-07-28 has no session, and a host whose requests land on different processes
 * (EDGE's isolates) cannot keep a per-conversation record without shared storage that races.
 */
export type SkillGate = {
  /** The token `loadSkill` hands out for a skill, keyed by the skill's registry key. */
  readonly issue: (skillKey: string) => Effect.Effect<string>;
  /** Whether `token` is the one issued for any of `ownerSkillKeys`. */
  readonly verify: (ownerSkillKeys: readonly string[], token: string | undefined) => Effect.Effect<boolean>;
};

/**
 * A {@link SkillGate} whose token is one common word derived from the skill's key alone, so every
 * process issues and accepts the same word with nothing to configure or share.
 */
export const skillGate = (): SkillGate => ({
  issue: (skillKey) => Effect.succeed(skillTokenInternal.derive(skillKey)),
  verify: (ownerSkillKeys, token) =>
    Effect.succeed(
      token !== undefined &&
        ownerSkillKeys.map(skillTokenInternal.derive).includes(skillTokenInternal.normalize(token)),
    ),
});

export type HostShape = {
  readonly invoke: (request: InvokeRequest) => Effect.Effect<unknown, HostError>;
  /**
   * Spaces this session may address. No member is a default: a call that names none is refused.
   * Omitted is unrestricted; empty is a host that enumerated and found none, refusing every call.
   */
  readonly spaceIds?: readonly string[];
  /** The database of a space the session may address, which a script runs against; omitted, scripts do not run. */
  readonly database?: (spaceId: SpaceId) => Effect.Effect<Database.Database, HostError>;
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
    'operation descriptions alone do not carry. The result carries a skillToken: pass it to ' +
    "invokeOperation with every call to one of this skill's operations, which are refused without it. " +
    'Omit the skill argument to list every skill this server offers. The same skills are exposed to ' +
    'users as prompts; loading one here brings the identical text into context without user action. ' +
    'No side effects.',
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
    skillToken: Schema.optional(
      Schema.String.annotate({
        description:
          "Pass as invokeOperation's skillToken when calling this skill's operations. Returned only " +
          'when a skill was named.',
      }),
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
            'Skills this operation belongs to; invokeOperation refuses it without the skillToken ' +
            'loadSkill returns for one of them.',
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
    'first call; input must match that schema. An operation whose row names skills is refused unless ' +
    "skillToken is the token loadSkill returned for one of them. Check the operation's mutation class in its row " +
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
    skillToken: Schema.optional(
      Schema.String.annotate({
        description:
          'The skillToken loadSkill returned for a skill this operation belongs to (see its queryOperations row).',
      }),
    ),
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
  skillToken?: string;
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
 * Answers one `loadSkill` call, issuing the token that unlocks the named skill's operations. A
 * listing issues nothing, since it carries no instructions.
 */
export const loadSkill = (
  registry: Registry.Registry,
  gate: SkillGate,
  skill: string | undefined,
): Effect.Effect<SkillListing, ToolFailure> =>
  loadSkillByName(registry, skill).pipe(
    Effect.flatMap((listing) =>
      listing.instructions === undefined || listing.skills.length === 0
        ? Effect.succeed(listing)
        : Effect.map(gate.issue(listing.skills[0].key), (skillToken) => ({ ...listing, skillToken })),
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

export type InvokeArguments = {
  key: string;
  input?: Record<string, unknown>;
  spaceId?: SpaceId;
  skillToken?: string;
};

/**
 * Dispatches one `invokeOperation` call: check its token proves a governing skill was read, validate
 * the input, resolve the space, invoke, qualify refs.
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
  { key, input, spaceId, skillToken }: InvokeArguments,
  gate: SkillGate,
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
      const ownerKeys = owners.flatMap((name) => skills.find((candidate) => candidate.promptName === name)?.key ?? []);
      if (!(yield* gate.verify(ownerKeys, skillToken))) {
        const options = owners.map((name) => `'${name}'`).join(' or ');
        const problem =
          skillToken === undefined
            ? `${operationKey} belongs to the ${options} skill and was called without its skillToken.`
            : `'${skillToken}' is not the skillToken of the ${options} skill, which ${operationKey} belongs to.`;
        return yield* Effect.fail(
          failure(
            'skill_not_loaded',
            `${problem} Call loadSkill with skill: '${owners[0]}', follow the instructions it returns, then ` +
              'retry this call passing the skillToken it returns.',
          ),
        );
      }

      return yield* dispatch(host, record, operationKey, { input, spaceId });
    }),
  );

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
// spent in the client's context. `runScript` lets the caller write that loop once instead, in code
// mode's Effect dialect: the DXOS API over the space's database, with the operations the skills name
// through the same skill gate and space rules. Only what it prints comes back.
//

/** What one `runScript` call produced: what it printed, why it failed when it did, and its operation calls. */
export type ScriptResult = Operation.ScriptResult;
export type ScriptStats = Operation.ScriptStats;

/**
 * The text a `runScript` call answers with: what the program printed (the failure its last line, when it failed),
 * then a trailer with the operation calls it made and how long they took, so the caller can tell a slow script from
 * a chatty one without asking for timings in the code.
 */
export const formatScriptAnswer = ({ output, error, stats }: ScriptResult, totalMs: number): string => {
  const trailer = [
    stats ? `${stats.calls} ${stats.calls === 1 ? 'call' : 'calls'}` : undefined,
    stats ? `${stats.callMs} ms in calls` : undefined,
    `${Math.round(totalMs)} ms total`,
  ].filter((part) => part !== undefined);
  // Code mode prints the failure as the last line; a runner that only reports it has it added here.
  const failureLine = error === undefined || output.includes(error) ? undefined : `Error: ${error}`;
  return [output, failureLine, `---\n${trailer.join(' · ')}`]
    .filter((part) => part !== undefined && part.length > 0)
    .join('\n');
};

/** Where a script runs, and its budget. */
export type ScriptOptions = {
  /** Bounds one script; what "bounds" means is the sandbox's. */
  readonly timeout?: Duration.Input;
  /** Characters of printed output returned before it is truncated. */
  readonly maxOutput?: number;
} & (
  | {
      /**
       * Runs the script here, against the host's `database`: code mode's `Sandbox.inProcess` is not a boundary, a
       * `WorkerSandbox` spawning `WorkerSandboxWorkerd` isolates is.
       */
      readonly sandbox: Sandbox.Sandbox;
    }
  | {
      /**
       * Hands the script, as an Effect-dialect request, to a runner in another runtime, which governs its calls
       * itself: EDGE's MCP router runs no code and hands it to compute-service.
       */
      readonly runner: Operation.ScriptRunner;
    }
);

const DEFAULT_SCRIPT_TIMEOUT = Duration.seconds(60);
const DEFAULT_SCRIPT_MAX_OUTPUT = 16_000;

const RUN_SCRIPT_DESCRIPTION = trim`
  Runs a program written against the DXOS API in one space and returns what it printed. Use it instead of a chain of
  invokeOperation calls when a task touches many objects or needs a loop, a filter or a join.

  \`code\` is the body of an \`Effect.gen\` generator: write \`yield*\` statements directly, without the wrapper.
  Nothing outside the names below is in scope: no import, require or fetch. They act on the space \`spaceId\` names.

  ${EFFECT_API}

  \`yield* Operation.invoke(yield* Database.resolve(key), input)\` runs an operation exactly as invokeOperation
  does: the keys and input schemas queryOperations returns, the same skill gate and space. Pass the skillTokens
  loadSkill returned for the skills whose operations the script calls.

  Only printed values reach you: print the fields you need, not whole objects. The answer is the printed text, with
  the failure as its last line when the program threw (the call is then an error), then a trailer after \`---\`
  counting the operation calls the program made and the time they took.
`;

export const RunScript = Tool.make('runScript', {
  description: RUN_SCRIPT_DESCRIPTION,
  parameters: Schema.Struct({
    code: Schema.String.annotate({
      description: 'The body of an Effect.gen generator, without the wrapper. Print anything you need to see.',
    }),
    spaceId: SpaceId.annotate({
      description:
        'The space the script reads and changes, and its operations run in. Take it from whoami or from a ' +
        'reference already in hand.',
    }),
    skillTokens: Schema.optional(
      Schema.Array(Schema.String).annotate({
        description:
          'skillTokens loadSkill returned earlier in this conversation, for the skills whose operations the ' +
          'script invokes.',
      }),
    ),
  }),
  success: Schema.Struct({
    output: Schema.String.annotate({
      description: 'Everything the script printed, in order; when it failed, the failure is the last line.',
    }),
    error: Schema.optional(Schema.String.annotate({ description: 'Why the program failed, when it did.' })),
  }),
  failure: ToolFailure,
})
  .annotate(Tool.Readonly, false)
  .annotate(Tool.Destructive, true);

/** The fixed surface plus {@link RunScript}, served when a host opts into code mode. */
export const ScriptServerToolkit = Toolkit.make(QueryOperations, InvokeOperation, LoadSkill, RunScript);

/**
 * Answers one `runScript` call: the program runs in code mode's Effect dialect through code mode's runner, the
 * `Operation.ScriptRunner` scripts run through, against the database of the space it names. A host whose options name
 * a `runner` instead hands it the request, and that runner answers it, wherever it runs, with this function.
 */
export const runScript = (
  registry: Registry.Registry,
  host: HostShape,
  gate: SkillGate,
  { code, spaceId, skillTokens = [] }: { code: string; spaceId?: SpaceId; skillTokens?: readonly string[] },
  options: ScriptOptions,
): Effect.Effect<ScriptResult> =>
  Effect.gen(function* () {
    const { timeout = DEFAULT_SCRIPT_TIMEOUT, maxOutput = DEFAULT_SCRIPT_MAX_OUTPUT } = options;
    const resolved = yield* spaceInternal.resolveId(host.spaceIds, spaceId, { required: true });
    if (resolved === undefined) {
      return failed('A script runs against one space: pass spaceId.');
    }
    const request: Operation.ScriptRequest = {
      source: Operation.inlineScript(code, { dialect: Operation.ScriptDialects.Effect }),
      spaceId: resolved,
      skillTokens,
      timeoutMs: Duration.toMillis(Duration.fromInputUnsafe(timeout)),
      maxOutput,
    };
    if ('runner' in options) {
      return yield* options.runner.run(request);
    }
    const { database } = host;
    if (database === undefined) {
      return failed('This server runs no scripts: its host gives them no database.');
    }
    const db = yield* database(resolved).pipe(
      Effect.mapError((error) => failure('operation_failed', `The space's database did not open: ${error.message}`)),
    );
    const stats = { calls: 0, callMs: 0 };
    const operations = yield* scriptOperations(registry, host, gate, { spaceId: resolved, skillTokens, stats });
    const runner = CodeModeRunner.make({
      sandbox: options.sandbox,
      runtime: Context.make(Database.Service, Database.makeService(db)).pipe(
        Context.add(Operation.Service, scriptOperationService(operations)),
      ),
      operations,
      dialects: { effect: EffectDialect },
    });
    const result = yield* runner.run(request);
    return { ...result, stats: { ...stats } };
  }).pipe(
    // A failure before the program ran is the script's too: the caller is a model, which reads the message
    // rather than losing the turn to a tool error.
    Effect.catchTags({
      ToolFailure: ({ message }) => Effect.succeed(failed(message)),
      ScriptError: ({ message }) => Effect.succeed(failed(message)),
    }),
  );

/** A script that did not run, answered as one whose last printed line is its failure. */
const failed = (message: string): ScriptResult => ({ output: `Error: ${message}`, error: message });

/**
 * The operations a script resolves by key: every one an opted-in skill names, except those the API replaces. Each is a
 * stand-in definition naming the record's key, which `Database.resolve` answers and `Operation.invoke` runs through
 * {@link scriptOperationService} as `invokeOperation` runs it, presenting the script's tokens to the skill gate. Each
 * call is counted into `stats`.
 */
const scriptOperations = (
  registry: Registry.Registry,
  host: HostShape,
  gate: SkillGate,
  {
    spaceId,
    skillTokens,
    stats,
  }: { spaceId: SpaceId; skillTokens: readonly string[]; stats: { calls: number; callMs: number } },
): Effect.Effect<SandboxOperation[], ToolFailure> =>
  catchCollision(
    Effect.gen(function* () {
      const owners = viewInternal.ownersOf(yield* viewInternal.mcpSkills(registry));
      const records = yield* viewInternal.findRecords(registry, undefined);
      return records.flatMap((record): SandboxOperation[] => {
        const name = viewInternal.toolNameOf(record);
        const key = viewInternal.nsid(Operation.getKey(record) ?? '');
        // A key `Database.resolve` cannot name is not reachable from a script.
        const dxn = DXN.tryMake(`dxn:${key}`);
        if (
          name == null ||
          dxn === undefined ||
          !owners.has(name) ||
          Option.isSome(Annotation.get(record, Operation.HiddenInCodeModeAnnotation))
        ) {
          return [];
        }
        return [
          {
            name,
            ...(record.description === undefined ? {} : { description: record.description }),
            parameters: record.inputSchema ?? {},
            definition: standInDefinition(dxn, name, record.description),
            invoke: (input: unknown) =>
              invokeWithTokens(registry, host, gate, { key, input: toWireInput(input), spaceId }, skillTokens).pipe(
                Effect.timed,
                Effect.map(([duration, output]) => {
                  stats.callMs += Math.round(Duration.toMillis(duration));
                  return output;
                }),
                Effect.ensuring(Effect.sync(() => stats.calls++)),
                // Raised in the program, which reads the message: a call it may retry with a token says how, first,
                // since code mode cuts a long failure line.
                Effect.mapError(
                  ({ code, message }) =>
                    new Error(
                      code === 'skill_not_loaded'
                        ? `In a script, pass the skill's token in runScript's skillTokens. ${message}`
                        : message,
                    ),
                ),
                Effect.orDie,
              ),
          },
        ];
      });
    }),
  );

/**
 * A definition carrying only an operation record's key: the record is all an MCP server holds, and the real definition
 * lives with its handler wherever the operation runs. Its input and output are left undecoded here, since the
 * operation's own handler decodes them.
 */
const standInDefinition = (key: DXN.DXN, name: string, description: string | undefined): Operation.Definition.Any =>
  Operation.make({
    // The record's own key; the literal lives where the operation is declared, which is what the rule protects.
    // eslint-disable-next-line @dxos/rules/operation-key-shape
    meta: { key, name, ...(description === undefined ? {} : { description }) },
    input: Schema.Unknown,
    output: Schema.Unknown,
  });

/**
 * An operation's input in `invokeOperation`'s wire form: a reference becomes its `{"/": uri}` envelope and an object
 * its snapshot, which is what JSON makes of them, and an `undefined` field is dropped, as a tool call's JSON drops it.
 */
const toWireInput = (input: unknown): Record<string, unknown> | undefined => {
  const json: unknown = JSON.parse(JSON.stringify(input ?? {}));
  return json !== null && typeof json === 'object' && !Array.isArray(json)
    ? (json as Record<string, unknown>)
    : undefined;
};

/**
 * {@link invoke} with each of the script's tokens in turn until one is accepted; only a refusal for
 * the token moves on to the next, so any other failure is the call's own and is returned at once.
 */
const invokeWithTokens = (
  registry: Registry.Registry,
  host: HostShape,
  gate: SkillGate,
  request: InvokeArguments,
  skillTokens: readonly string[],
): Effect.Effect<Record<string, unknown>, ToolFailure> => {
  const candidates = [...new Set([request.skillToken, ...skillTokens].filter((token) => token !== undefined))];
  const attempt = (index: number): Effect.Effect<Record<string, unknown>, ToolFailure> =>
    invoke(registry, host, { ...request, skillToken: candidates[index] }, gate).pipe(
      Effect.catchIf(
        (error) => error.code === 'skill_not_loaded' && index + 1 < candidates.length,
        () => attempt(index + 1),
      ),
    );
  return attempt(0);
};

/**
 * What `Operation.invoke` resolves inside a script: the script's operations by key, each through the skill gate. An
 * operation the script was not offered fails the program, naming the way it is reached instead.
 */
const scriptOperationService = (operations: readonly SandboxOperation[]): Operation.OperationService => {
  const byKey = new Map(
    operations.flatMap(({ definition, invoke }) =>
      definition === undefined ? [] : [[viewInternal.nsid(String(definition.meta.key)), invoke] as const],
    ),
  );
  const run = (op: Operation.Definition.Any, input: unknown): Effect.Effect<unknown> => {
    const key = viewInternal.nsid(String(op.meta.key));
    const invoke = byKey.get(key);
    return invoke === undefined
      ? Effect.die(
          new Error(
            `${key} is not offered in a script: read and change objects through Database and Obj, and invoke only ` +
              'the operations queryOperations lists for the skills you loaded.',
          ),
        )
      : invoke(input);
  };
  const call = <O>(op: Operation.Definition<any, O, any>, input: unknown) =>
    run(op, input).pipe(Effect.flatMap(Schema.decodeUnknownEffect(op.output)), Effect.orDie);
  return {
    invoke: (op, ...[input]) => call(op, input),
    schedule: () => Effect.die(new Error('A script cannot schedule an operation; invoke it instead.')),
    invokePromise: (op, ...[input]) =>
      EffectEx.runPromise(call(op, input)).then(
        (data) => ({ data }),
        (error: unknown) => ({ error: error instanceof Error ? error : new Error(String(error)) }),
      ),
  };
};

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

//
// Identity.
//

export const SpaceInfo = Schema.Struct({
  spaceId: Schema.String,
  name: Schema.optional(Schema.String).annotate({
    description: 'Display name of the space. Absent when the space is unnamed or its properties are unreadable.',
  }),
  memberCount: Schema.optional(Schema.Number).annotate({
    description:
      'Number of identities with membership. 1 means the space is private to this identity; more ' +
      'means it is shared. Absent when membership could not be read.',
  }),
});
export type SpaceInfo = Schema.Schema.Type<typeof SpaceInfo>;

export const WhoAmIResult = Schema.Struct({
  // The DID, not the identity key: it is the identity's public name — what EDGE authorizes
  // against and what every other surface reports — where the key is an implementation detail.
  identityDid: Schema.String,
  displayName: Schema.optional(Schema.String),
  spaces: Schema.Array(SpaceInfo).annotate({
    description:
      'The data spaces this session can operate on. None of them is a default: a call that acts ' +
      'on a space must name one.',
  }),
});
export type WhoAmIResult = Schema.Schema.Type<typeof WhoAmIResult>;

/**
 * Identity and session spaces, mirroring EDGE's `mcp-space-service` tool of the same name. Every host that
 * holds a client serves it — the project skill confirms its space with it before any write — while the
 * handler stays the host's, since only the host knows whose identity and which spaces the session has.
 */
export const WhoAmI = Tool.make('whoami', {
  description:
    'Returns the authenticated DXOS identity and the data spaces this session can operate on, each ' +
    'with its name and member count — refer to a space by name when talking to the user, and pass ' +
    'its id when calling a tool.',
  parameters: Tool.EmptyParams,
  success: WhoAmIResult,
  failure: ToolFailure,
})
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false);

export const WhoAmIToolkit = Toolkit.make(WhoAmI);

/** What {@link describeSpace} reads of a space: the client's `Space`, without depending on the client. */
export type DescribableSpace = {
  readonly id: string;
  readonly properties: { readonly name?: unknown };
  readonly members: { get(): readonly unknown[] };
};

/**
 * Describes one of the session's spaces. Best-effort per field: a space whose properties or membership
 * cannot be read yet is still listed, with whatever did resolve.
 */
export const describeSpace = (spaceId: string, space: DescribableSpace | undefined): SpaceInfo => {
  if (!space) {
    return { spaceId };
  }
  const name = readSpaceField(space, 'properties', () => space.properties.name);
  // `undefined` rather than 0 when the read fails: a space always has a member, so 0 would be a claim about it.
  const memberCount = readSpaceField(space, 'members', () => space.members.get().length);
  return {
    spaceId,
    ...(typeof name === 'string' && { name }),
    ...(typeof memberCount === 'number' && { memberCount }),
  };
};

/** Properties and members are unreadable until the space is open, which a listing must not wait on. */
const readSpaceField = <T>(space: DescribableSpace, field: string, read: () => T): T | undefined => {
  try {
    return read();
  } catch (error) {
    log.warn('failed to read space field', { spaceId: space.id, field, error });
    return undefined;
  }
};

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
  /** Serves {@link RunScript} as well, run where these options say; omitted, code mode is off. */
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
      // One gate for every tool, so a token `loadSkill` issued is accepted inside a script as well.
      const gate = skillGate();
      return {
        source,
        host,
        gate,
        handlers: {
          queryOperations: (query: Parameters<typeof queryOperations>[1]) =>
            Effect.flatMap(source.registry, (registry) => queryOperations(registry, query)),
          invokeOperation: (request: InvokeArguments) =>
            Effect.flatMap(source.registry, (registry) => invoke(registry, host, request, gate)),
          loadSkill: ({ skill }: { skill?: string }) =>
            Effect.flatMap(source.registry, (registry) => loadSkill(registry, gate, skill)),
        },
      };
    });
    if (script == null) {
      return McpServer$.toolkit(ServerToolkit).pipe(
        Layer.provide(ServerToolkit.toLayer(Effect.map(handlers, ({ handlers }) => ServerToolkit.of(handlers)))),
      );
    }
    // Built once, so the toolkit's handlers and the plain-text runScript share one skill gate.
    const built = yield* handlers;
    const runScriptRequest = (request: typeof RunScript.parametersSchema.Type) =>
      Effect.flatMap(built.source.registry, (registry) => runScript(registry, built.host, built.gate, request, script));
    return Layer.effectDiscard(
      Effect.gen(function* () {
        yield* McpServer$.registerToolkit(ScriptServerToolkit);
        yield* registerPlainTextRunScript(runScriptRequest);
      }),
    ).pipe(
      Layer.provide(
        ScriptServerToolkit.toLayer(ScriptServerToolkit.of({ ...built.handlers, runScript: runScriptRequest })),
      ),
      Layer.provide(McpServer$.McpServer.layer),
    );
  }).pipe(Layer.unwrap);

/**
 * Re-registers {@link RunScript} to answer with text rather than the toolkit's JSON-encoded result:
 * the answer is meant to be read, and a failed program is an error result. The toolkit registration
 * it replaces supplies the descriptor (schema, description, annotations); the output schema is
 * dropped, since a tool that declares one must answer with structured content.
 */
const registerPlainTextRunScript = (
  run: (request: typeof RunScript.parametersSchema.Type) => Effect.Effect<ScriptResult, ToolFailure>,
): Effect.Effect<void, never, McpServer$.McpServer> =>
  Effect.gen(function* () {
    const server = yield* McpServer$.McpServer;
    const registered = server.tools.find(({ tool }) => tool.name === RunScript.name);
    if (registered === undefined) {
      return yield* Effect.die(new Error(`${RunScript.name} was not registered by its toolkit.`));
    }
    const decode = Schema.decodeUnknownEffect(RunScript.parametersSchema);
    yield* server.addTool({
      tool: new McpSchema.Tool({ ...registered.tool, outputSchema: undefined }),
      annotations: registered.annotations,
      handle: (payload) =>
        decode(payload ?? {}).pipe(
          Effect.mapError((error) => new McpSchema.InvalidParams({ message: String(error) })),
          Effect.flatMap((request) =>
            Effect.timed(run(request)).pipe(
              Effect.map(
                ([duration, result]) =>
                  new McpSchema.CallToolResult({
                    isError: result.error !== undefined,
                    content: [{ type: 'text', text: formatScriptAnswer(result, Duration.toMillis(duration)) }],
                  }),
              ),
              Effect.catchTag('ToolFailure', (error) =>
                Effect.succeed(
                  new McpSchema.CallToolResult({ isError: true, content: [{ type: 'text', text: error.message }] }),
                ),
              ),
            ),
          ),
        ),
    });
  });

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
