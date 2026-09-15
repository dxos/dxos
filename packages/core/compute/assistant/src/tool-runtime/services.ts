//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import type * as JsonSchema from 'effect/JsonSchema';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Record from 'effect/Record';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';
import * as Tool from 'effect/unstable/ai/Tool';
import type * as Toolkit from 'effect/unstable/ai/Toolkit';

import { AiToolNotFoundError, ToolExecutionService, ToolResolverService } from '@dxos/ai';
import { OpaqueToolkit } from '@dxos/ai';
import * as Operation from '@dxos/compute/Operation';
import { todo } from '@dxos/debug';
import { Filter, Ref, Registry } from '@dxos/echo';
import { SchemaAST, SchemaEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { RefFromLLM } from '../util/index.ts';

export const makeToolResolverFromOperations = <R = never>({
  toolkit: extraToolkit = OpaqueToolkit.empty,
}: { toolkit?: OpaqueToolkit.OpaqueToolkit<never, never, R> } = {}): Layer.Layer<
  ToolResolverService,
  never,
  OpaqueToolkit.OpaqueToolkitProvider | Registry.Service | R
> => {
  // `Layer.effect` runs construction in the layer's own scope, so the subscription below is released
  // with the layer.
  return Layer.effect(
    ToolResolverService,
    Effect.gen(function* () {
      const toolkitProvider = yield* OpaqueToolkit.OpaqueToolkitProvider;
      const registry = yield* Registry.Service;

      // Tool names derive from operation keys lossily (`Operation.toolNameFromKey`), so a record is
      // matched by re-deriving its name rather than by reconstructing a key — which rules out the
      // indexed key lookup and would otherwise mean scanning every operation per resolution.
      let index: Map<string, Operation.PersistentOperation[]> | undefined;
      // Dropped on any registry change rather than only on a lookup miss: a hit against a stale index
      // would resolve a name whose second claimant registered after the build, silently picking one
      // of two operations instead of reporting the ambiguity below. The counter carries that signal
      // across the query's own await, where clearing `index` alone would be undone by the assignment
      // of a snapshot the change is already missing from.
      let generation = 0;
      yield* Effect.acquireRelease(
        Effect.sync(() =>
          registry.changed.on(() => {
            index = undefined;
            generation++;
          }),
        ),
        (unsubscribe) => Effect.sync(() => unsubscribe()),
      );
      const buildIndex = Effect.fn('buildToolNameIndex')(function* () {
        // Retries rather than caching a snapshot the registry has already moved past; a change during
        // the query is rare and finite, so this settles on the first quiet pass.
        while (true) {
          const seen = generation;
          const records = yield* Effect.promise(() => registry.query(Filter.type(Operation.PersistentOperation)).run());
          const built = new Map<string, Operation.PersistentOperation[]>();
          for (const record of records) {
            const key = Operation.getKey(record);
            if (key == null) {
              continue;
            }
            // Non-throwing: a record's key is untrusted, and one that cannot derive a valid name must
            // cost only its own tool rather than every registry-backed tool in the index.
            const name = Operation.tryToolNameFromKey(key);
            if (name == null) {
              log.warn('operation key cannot derive a valid tool name; not indexed', { key });
              continue;
            }
            built.set(name, [...(built.get(name) ?? []), record]);
          }
          if (generation === seen) {
            index = built;
            return built;
          }
        }
      });

      return {
        resolve: (id): Effect.Effect<Tool.Any, AiToolNotFoundError> =>
          Effect.gen(function* () {
            const toolkit = OpaqueToolkit.merge(extraToolkit, yield* toolkitProvider.getToolkit());

            const tool = toolkit.toolkit.tools[id];
            if (tool) {
              return tool;
            }

            // A miss is conclusive: any registration since the build dropped the index above, so a
            // rebuild here would only re-scan the registry for every id that is not an operation.
            const matches = (index ?? (yield* buildIndex())).get(id);
            if (matches == null) {
              return yield* Effect.fail(new AiToolNotFoundError(id));
            }
            // Two keys deriving one name (`webSearch` vs `web-search`) is an authoring error. Picking
            // the first match would silently shadow the other, so it fails here instead — the only
            // place both keys are visible at once (a ToolId no longer distinguishes them).
            invariant(
              matches.length === 1,
              `Tool name "${id}" is claimed by ${matches.length} operations: ${matches
                .map((record) => Operation.getKey(record))
                .join(', ')}`,
            );
            // A registry record is untrusted input: its persisted schema may be one the projection
            // cannot express as tool parameters. Throwing here would surface as a defect and fail
            // the whole request, so one unprojectable operation is logged and dropped instead —
            // `resolveToolkit` filters a not-found tool out and the agent runs with the rest.
            try {
              return projectFunctionToTool(Operation.deserialize(matches[0]));
            } catch (err) {
              log.error('operation cannot be projected to a tool; excluded from context', {
                id,
                key: Operation.getKey(matches[0]),
                err,
              });
              return yield* Effect.fail(new AiToolNotFoundError(id));
            }
          }),
      } satisfies Context.Service.Shape<typeof ToolResolverService>;
    }),
  );
};

export const makeToolExecutionService = <E, R>(opts: {
  invoke: (tool: Tool.Any, input: unknown) => Effect.Effect<unknown>;
}): Layer.Layer<ToolExecutionService, never, OpaqueToolkit.OpaqueToolkitProvider> =>
  Layer.effect(
    ToolExecutionService,
    Effect.gen(function* () {
      const toolkitProvider = yield* OpaqueToolkit.OpaqueToolkitProvider;
      const toolkit = yield* toolkitProvider.getToolkit();

      const toolkitHandler = yield* toolkit.toolkit.pipe(Effect.provide(toolkit.layer));
      if (!isHandlerLike(toolkitHandler)) {
        return yield* Effect.die(new Error('Toolkit produced a handler-less toolkit instance'));
      }

      return {
        handlersFor: (toolkit) => {
          const makeHandler = (tool: Tool.Any): ((params: unknown) => Effect.Effect<unknown, any, any>) => {
            return Effect.fn(`toolFunctionHandler ${tool.name}`)(function* (input: unknown) {
              if (toolkitHandler.tools[tool.name]) {
                if (Tool.isProviderDefined(tool)) {
                  throw new Error('Attempted to call a provider-defined tool');
                }

                // `handle` streams preliminary results before the final one; the toolkit
                // interrupts the handler fiber once its effect settles, so the final result is
                // always the last item emitted — `Stream.runLast` recovers exactly that value.
                const resultStream = yield* toolkitHandler.handle(tool.name, input);
                const lastResult = yield* Stream.runLast(resultStream);
                const handlerResult = yield* Option.match(lastResult, {
                  onNone: () => Effect.die(new Error(`Tool "${tool.name}" handler produced no result`)),
                  onSome: Effect.succeed,
                });
                return handlerResult.result;
              }

              // Every `invoke` implementation (in-process, or a child process spawned by the agent)
              // funnels through here, so the projected schema is applied once, at the boundary where
              // the model's raw arguments arrive. A malformed argument dies and is caught just below,
              // reaching the model as an error it can retry from.
              const decoded = yield* decodeToolParameters(tool, input).pipe(Effect.orDie);
              return yield* opts.invoke(tool, decoded).pipe(Effect.catchDefect((defect) => Effect.fail(defect)));
            });
          };

          return toolkit.of(
            // Operations project to dynamic tools (see `projectFunctionToTool`), which are handled here
            // just like user-defined ones; only provider-executed tools have no local handler.
            Record.map(toolkit.tools, (tool, _name) =>
              Tool.isUserDefined(tool) || Tool.isDynamic(tool) ? makeHandler(tool) : null,
            ) as any,
          ) as any;
        },
      };
    }),
  );

export const makeToolExecutionServiceFromOperationInvoker = (): Layer.Layer<
  ToolExecutionService,
  never,
  Operation.Service | OpaqueToolkit.OpaqueToolkitProvider
> => {
  return Layer.unwrap(
    Effect.gen(function* () {
      const operationInvoker = yield* Operation.Service;

      return makeToolExecutionService({
        invoke: (tool, input) =>
          Effect.gen(function* () {
            const operationDef = getOperationFromTool(tool).pipe(Option.getOrThrow);

            return yield* operationInvoker.invoke(operationDef, input).pipe(Effect.orDie);
          }),
      });
    }),
  );
};

export const ToolExecutionServices = Layer.mergeAll(
  makeToolResolverFromOperations(),
  makeToolExecutionServiceFromOperationInvoker(),
);

class FunctionToolAnnotation extends Context.Service<
  FunctionToolAnnotation,
  { definition: Operation.Definition.Any; parameters: Schema.Codec<unknown, unknown> }
>()('@dxos/assistant/FunctionToolAnnotation') {}

export const getOperationFromTool = (tool: Tool.Any): Option.Option<Operation.Definition.Any> => {
  return Context.getOption(FunctionToolAnnotation)(tool.annotations).pipe(Option.map(({ definition }) => definition));
};

/**
 * Decodes a model's raw tool arguments against the projected parameter schema.
 *
 * A dynamic tool carries a JSON Schema, so `Toolkit.handle` passes the arguments through unvalidated
 * (that is what lets us state the schema the model is actually held to — see `projectFunctionToTool`).
 * Decoding here keeps the coercions the projection introduces, above all a ref supplied as a URI
 * string becoming a `Ref`, and surfaces a malformed argument to the model as a tool error.
 */
const decodeToolParameters = (tool: Tool.Any, input: unknown): Effect.Effect<unknown, Schema.SchemaError> =>
  Context.getOption(FunctionToolAnnotation)(tool.annotations).pipe(
    Option.match({
      onNone: () => Effect.succeed(input),
      onSome: ({ parameters }) => Schema.decodeUnknownEffect(parameters)(input),
    }),
  );

const toolCache = new WeakMap<Operation.Definition.Any, Tool.Any>();

/**
 * Parameter schema for an operation that takes no input.
 *
 * Spelled as a record with an uninhabited value type rather than `Schema.Struct({})` because v4
 * emits an empty struct as `{anyOf: [{type: 'object'}, {type: 'array'}]}`, whose object branch
 * declares no `additionalProperties`. A provider's strict tool mode rejects that outright
 * ("For 'object' type, 'additionalProperties' must be explicitly set to false"), and one bad tool
 * fails the whole request. A `Never` value type admits no keys, so this emits
 * `{type: 'object', additionalProperties: false}` — the same shape, and valid under strict.
 * A JSON-schema annotation cannot express this: v4 honours only a fixed annotation whitelist.
 */
const EMPTY_PARAMETERS_SCHEMA = Schema.Record(Schema.String, Schema.Never);

/**
 * Projects an `Operation.Definition` into an `AiTool`.
 * Exported for testing.
 */
export const projectFunctionToTool = (fn: Operation.Definition.Any): Tool.Any => {
  if (toolCache.has(fn)) {
    return toolCache.get(fn)!;
  }

  const fields = createStructFieldsFromSchema(fn.input);
  const parametersSchema = Object.keys(fields).length === 0 ? EMPTY_PARAMETERS_SCHEMA : Schema.Struct(fields);
  const tool = Tool.dynamic(Operation.toolName(fn), {
    description: fn.meta.description,
    // A dynamic tool's JSON Schema is passed to the provider verbatim (`Tool.getJsonSchema` returns
    // it before any transformer runs), which is the only way to keep what the model is told and what
    // we validate in agreement. Handed an Effect schema instead, rc.108 describes the tool through
    // the provider's structured-output codec while `Toolkit.handle` validates against the
    // untransformed schema, so a compliant model is always rejected: a record is advertised as an
    // array of `[key, value]` pairs but validated as an object, and an optional key is advertised as
    // nullable-and-required but validated as absent-or-`T`.
    parameters: toModelJsonSchema(parametersSchema),
    failure: Schema.Any,
  })
    .annotate(FunctionToolAnnotation, { definition: fn, parameters: parametersSchema })
    // The schema above states open records and omissible optional keys, which a provider's strict tool
    // mode forbids (it demands `additionalProperties: false` and every key in `required`). Operations
    // accept arbitrary input, so strict is off for all of them rather than per-operation — one
    // non-conforming tool rejects the whole request.
    .annotate(Tool.Strict, false);
  toolCache.set(fn, tool);
  return tool;
};

/**
 * Emits the JSON Schema the model is shown for a tool's parameters.
 *
 * v4 renders `Schema.optional(T)` as `anyOf: [T, null]` while its decoder accepts an absent key but
 * rejects `null`, so a model that takes the schema at its word is rejected. The null branch of an
 * optional property is therefore dropped, stating the property as the bare type and leaving it out of
 * `required` — the same contract ECHO's own emitter keeps (`stripUndefinedMember`) and the one the
 * pre-migration corpus was recorded against.
 */
const toModelJsonSchema = (schema: Schema.Codec<unknown, unknown>): JsonSchema.JsonSchema => {
  // A recursive parameter renders as `$ref: '#/$defs/…'` with the bodies in a separate `definitions`
  // record; keeping only the root would advertise a dangling reference to the model.
  const { schema: root, definitions } = Schema.toJsonSchemaDocument(schema);
  const document = Object.keys(definitions).length > 0 ? { ...root, $defs: definitions } : root;
  return statePropertyOpenness(dropNullBranches(document, new Set(asStringArray(schema))));
};

/**
 * States openness on every object node that leaves it implied.
 *
 * v4 omits `additionalProperties` when a record's value type is unconstrained, so an open property bag
 * reads as "some object". Absent, it also fails a provider's strict tool mode, which requires the key
 * to be present. `true` says what the record means and what the pre-migration corpus stated.
 */
const statePropertyOpenness = (node: JsonSchema.JsonSchema): JsonSchema.JsonSchema => {
  if (Array.isArray(node)) {
    // `JsonSchema.JsonSchema` (effect's own type) is a bare index signature that structurally
    // excludes arrays, even though a JSON Schema document legitimately nests them (e.g. `anyOf`).
    return node.map(statePropertyOpenness) as unknown as JsonSchema.JsonSchema;
  }
  if (typeof node !== 'object' || node === null) {
    return node;
  }
  const mapped = Object.fromEntries(
    Object.entries(node).map(([key, value]) => [
      key,
      typeof value === 'object' && value !== null ? statePropertyOpenness(value as JsonSchema.JsonSchema) : value,
    ]),
  );
  return mapped.type === 'object' && !('additionalProperties' in mapped)
    ? { ...mapped, additionalProperties: true }
    : mapped;
};

/** Property names the schema marks required; only optional properties carry the spurious null branch. */
const asStringArray = (schema: Schema.Codec<unknown, unknown>): readonly string[] => {
  const { required } = Schema.toJsonSchemaDocument(schema).schema;
  return Array.isArray(required) ? required.map(String) : [];
};

const dropNullBranches = (node: JsonSchema.JsonSchema, required: ReadonlySet<string>): JsonSchema.JsonSchema => {
  const properties = node.properties;
  if (typeof properties !== 'object' || properties === null) {
    return node;
  }
  return {
    ...node,
    properties: Object.fromEntries(
      Object.entries(properties).map(([name, value]) => [name, required.has(name) ? value : withoutNull(value)]),
    ),
  };
};

/** Collapses `anyOf: [T, null]` (nested arbitrarily deep by a non-idempotent `optional`) down to `T`. */
const withoutNull = (value: unknown): unknown => {
  if (typeof value !== 'object' || value === null || !('anyOf' in value)) {
    return value;
  }
  const { anyOf, ...rest } = value as { anyOf: unknown[] };
  const branches = anyOf.filter(
    (branch) => !(typeof branch === 'object' && branch !== null && (branch as { type?: unknown }).type === 'null'),
  );
  if (branches.length !== 1) {
    return { ...rest, anyOf: branches.map(withoutNull) };
  }
  const only = withoutNull(branches[0]);
  return typeof only === 'object' && only !== null ? { ...rest, ...only } : only;
};

// TODO(dmaretskyi): Factor out.
/**
 * Projects an operation input struct into the LLM-facing tool parameter fields, mapping each
 * property through {@link mapSchemaTypeForLLM} (so refs become the model-friendly `RefFromLLM`).
 * Exported for testing.
 */
export const createStructFieldsFromSchema = (
  schema: Schema.Codec<unknown, unknown>,
): Record<string, Schema.Codec<unknown, unknown>> => {
  switch (schema.ast._tag) {
    case 'Objects': {
      // One cache for the whole struct: sibling properties may reach the same recursive body.
      const expansions = new Map<SchemaAST.AST, SchemaAST.AST>();
      return Object.fromEntries(
        schema.ast.propertySignatures.map((prop) => [
          prop.name,
          Schema.make(mapSchemaTypeForLLM(prop.type, expansions)),
        ]),
      );
    }
    // All three spell "this operation takes no input". `Void` is the authored form; the other two
    // are what it degrades to across `Operation.serialize`/`deserialize`, which routes the schema
    // through JSON Schema: `Schema.Void` emits `{type: 'null'}` and reads back as `Null`, and an
    // operation persisted with no `inputSchema` at all reads back as `Schema.Unknown`.
    case 'Void':
    case 'Null':
    case 'Unknown':
      return {};
    default:
      return todo(`Unsupported schema AST: ${schema.ast._tag}`);
  }
};

/**
 * Picks an LLM-friendly schema type for the given schema AST.
 * The picked schema type decodes to the original schema type.
 */
const mapSchemaTypeForLLM = (
  ast: SchemaAST.AST,
  expansions: Map<SchemaAST.AST, SchemaAST.AST> = new Map(),
): SchemaAST.AST => {
  if (Ref.isRefType(ast)) {
    // v4's element and property nodes carry their own modifiers, so the wrapper types are gone and
    // the annotations record is optional.
    const own = SchemaAST.resolveAnnotations(ast)?.description;
    const fallback = SchemaAST.resolveAnnotations(RefFromLLM.ast)?.description as string;
    const description = own ? `${own}\n${fallback}` : fallback;
    // `optionalKey` puts the modifier on the ref node itself, so the rewrite must carry it across.
    return SchemaEx.retainContext(ast, RefFromLLM.annotate({ description }).ast);
  }

  // `mapAst` evaluates a suspended body eagerly, so a recursive schema would walk its own cycle
  // forever. Memoizing by body identity and rebuilding the suspend lazily closes the cycle: the
  // re-entrant call returns this very node instead of expanding the body again.
  if (SchemaAST.isSuspend(ast)) {
    const body = ast.thunk();
    let mapped = expansions.get(body);
    if (!mapped) {
      let expanded: SchemaAST.AST | undefined;
      mapped = new SchemaAST.Suspend(
        () => (expanded ??= mapSchemaTypeForLLM(body, expansions)),
        ast.annotations,
        undefined,
        ast.encoding,
        ast.context,
      );
      expansions.set(body, mapped);
    }
    return mapped;
  }

  // `mapAst` carries annotations, checks, encoding and `context` across every rebuilt node; in v4
  // optionality rides on `context`, so rebuilding by hand silently makes an optional key required.
  return SchemaEx.mapAst(ast, (child) => mapSchemaTypeForLLM(child, expansions));
};

/** Narrows `value` to {@link Toolkit.WithHandler} when it carries a non-null `tools` object and a `handle` function. */
export const isHandlerLike = (value: unknown): value is Toolkit.WithHandler<Record<string, Tool.Any>> => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'tools' in value &&
    typeof value.tools === 'object' &&
    value.tools !== null &&
    'handle' in value &&
    typeof value.handle === 'function'
  );
};
