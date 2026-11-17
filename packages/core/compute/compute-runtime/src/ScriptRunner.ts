//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import * as Script from '@dxos/compute/Script';
import { Annotation, Database, Obj, Ref } from '@dxos/echo';

/**
 * The script backend a runtime runs script operations with.
 *
 * Lives with the runtime because only a runtime uses it — a dependency of the process manager, not of a
 * caller: a client invokes a script operation like any other
 * operation (`Operation.invoke(script, input, { on })`) and never names this. It is a service so a
 * deployment chooses where scripts execute — in process, on a worker thread, in a contained isolate —
 * by providing a different layer to the process manager.
 */
export class Service extends Context.Service<Service, Operation.ScriptRunner>()('@dxos/compute/ScriptRunner') {}

/** Installs `runner` as the runtime's script backend. */
export const layer = (runner: Operation.ScriptRunner): Layer.Layer<Service> => Layer.succeed(Service, runner);

/**
 * Routes each request to the backend registered for its dialect, failing a dialect none claims.
 *
 * Dialect-keyed rather than one backend per deployment because the dialects differ in what their
 * bindings are, not in where they run: a runtime serving code mode's two dialects needs both, in the
 * same place.
 */
export const byDialect = (
  runners: Partial<Record<Operation.ScriptDialect, Operation.ScriptRunner>>,
): Operation.ScriptRunner => ({
  run: (request, runtime) =>
    Effect.suspend(() => {
      const dialect = Operation.scriptDialectOf(request.source);
      const runner = runners[dialect];
      return runner === undefined
        ? Effect.fail(
            new Operation.ScriptError({
              message: `No backend for dialect "${dialect}"; this runtime serves ${Object.keys(runners).join(', ') || 'none'}.`,
              context: { dialect },
            }),
          )
        : runner.run(request, runtime);
    }),
});

//
// Script data, as a runtime handles it.
//
// The schemas live here rather than beside the kind in `Operation`, because a source's schema needs
// the `Script` object type, whose module reaches the whole `@dxos/schema` barrel: a runtime that runs
// scripts pays for that, and an app's boot path — which loads `Operation` — does not.
//

/** Schema of a snippet source (`Operation.InlineScript`). */
export const InlineSource = Schema.Struct({
  _tag: Schema.Literal('inline'),
  code: Schema.String,
  dialect: Operation.ScriptDialect,
});

/** Schema of a source pointing at a `Script` object (`Operation.ScriptRef`). */
export const ObjectSource = Schema.Struct({
  _tag: Schema.Literal('object'),
  script: Ref.Ref(Script.Script),
});

/** Schema of `Operation.ScriptSource`. */
export const Source = Schema.Union([InlineSource, ObjectSource]);

/** Schema of `Operation.ScriptRequest`. */
export const Request = Schema.Struct({
  source: Source,
  input: Schema.optional(Schema.Unknown),
  spaceId: Schema.optional(Schema.String),
  timeoutMs: Schema.optional(Schema.Number),
  maxOutput: Schema.optional(Schema.Number),
  skillTokens: Schema.optional(Schema.Array(Schema.String)),
});

/**
 * The code a source holds: a snippet's own body, or the text of the `Script` object it points at.
 *
 * An object source is two ref loads — the script, then its text — so resolving one needs the database
 * those refs were read from; a snippet needs nothing, which is why a backend in another runtime can
 * be handed one whole.
 */
export const resolveSource = Effect.fnUntraced(function* (
  source: Operation.ScriptSource,
): Effect.fn.Return<{ readonly code: string; readonly dialect: Operation.ScriptDialect }, Operation.ScriptError> {
  if (Operation.isInlineScript(source)) {
    return { code: source.code, dialect: source.dialect };
  }
  const target = yield* Database.load(source.script).pipe(
    Effect.mapError((error) => new Operation.ScriptError({ message: `Script object did not load: ${String(error)}` })),
  );
  if (!Obj.instanceOf(Script.Script, target)) {
    return yield* Effect.fail(
      new Operation.ScriptError({
        message: `A script source must point at a Script object: ${Obj.getTypename(target)}`,
      }),
    );
  }
  const text = yield* Database.load(target.source).pipe(
    Effect.mapError((error) => new Operation.ScriptError({ message: `Script source did not load: ${String(error)}` })),
  );
  return { code: text.content, dialect: Operation.ScriptDialects.TypeScript };
});

/**
 * Annotation carrying a script operation's inline snippet on its persisted record.
 *
 * An annotation rather than a field on `Operation.PersistentOperation`: that schema is rendered into
 * agent prompts field by field, so a new field there changes what every agent reads about every
 * operation record — a cost only script operations should carry.
 */
export const InlineScriptAnnotation = Annotation.make({
  id: 'org.dxos.operation.script.inline',
  schema: InlineSource,
});

/**
 * Serializes a script operation to its registry record: a snippet rides as the
 * {@link InlineScriptAnnotation}, an object source in the record's own `source` ref.
 */
export const serialize = (
  operation: Operation.ScriptDefinition.Any,
  options?: Obj.MakeOptions,
): Operation.PersistentOperation => {
  const annotations = { ...(operation.meta.annotations ?? {}) };
  if (Operation.isInlineScript(operation.source)) {
    Annotation.setDictionary(annotations, InlineScriptAnnotation, operation.source);
  }
  const record = Operation.serialize(
    Operation.make({
      input: operation.input,
      output: operation.output,
      meta: { ...operation.meta, annotations },
      services: [],
    }),
    options,
  );
  const { source } = operation;
  if (Operation.isScriptRef(source)) {
    Obj.update(record, (record) => {
      record.source = source.script;
    });
  }
  return record;
};

/**
 * Reads a script operation back from its registry record, or undefined when the record holds no
 * script — a record of a compiled operation is not a malformed script, so it is not an error.
 */
export const deserialize = (record: Operation.PersistentOperation): Operation.ScriptDefinition.Any | undefined => {
  const definition = Operation.deserialize(record);
  const inline = Option.getOrUndefined(Annotation.get(record, InlineScriptAnnotation));
  // The record's `source` is a ref to any object (it predates script operations), so the typed ref is
  // rebuilt from its URI rather than reinterpreted; {@link resolveSource} is what reports a target
  // that turns out not to be a script.
  const source: Operation.ScriptSource | undefined =
    inline ?? (record.source !== undefined ? Operation.scriptRef(Ref.fromURI(record.source.uri)) : undefined);
  if (source === undefined) {
    return undefined;
  }
  return Operation.makeScript({
    meta: definition.meta,
    input: definition.input,
    output: definition.output,
    source,
  });
};
