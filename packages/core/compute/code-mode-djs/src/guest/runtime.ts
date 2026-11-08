//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, JsonSchema, Obj, Order, Query, Ref, Relation, Type } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as RuntimeProvider from '@dxos/effect/RuntimeProvider';
import { DXN, SpaceId, URI } from '@dxos/keys';

import { type EvaluationInit, type EvaluationResult, type Outcome, type TypeRecord } from '../protocol.ts';
import { decode, encode } from './codec.ts';
import { BridgeDatabase } from './database.ts';
import { host } from './host.ts';
import { GuestRegistry } from './registry.ts';

/** The model's program: the body of the `Effect.gen` generator, as the host compiled it. */
export type Program = () => Generator<
  Effect.Effect<unknown, unknown, Database.Service | Operation.Service>,
  unknown,
  never
>;

/** An operation the host ran for the guest and reported failed. */
class OperationFailed extends Schema.TaggedError<OperationFailed>('OperationFailed')('OperationFailed', {
  message: Schema.String,
}) {}

/** The types the image was prepared with; registered once, before any session opens. */
const registry = new GuestRegistry();

/** The session's database, once `open` has run. */
let session: { readonly db: BridgeDatabase } | undefined;

const requireSession = (): { readonly db: BridgeDatabase } => {
  if (!session) {
    throw new Error('The sandbox session is not open.');
  }
  return session;
};

/**
 * Rebuilds the host's types from their schema. Run once per set of types, in an image the engine then
 * keeps, since rebuilding schemas is most of what opening a session would otherwise cost.
 */
export const registerTypes = (types: readonly TypeRecord[]): void => {
  registry.add(
    // Skill annotations stay on the host, where printing reads them.
    types.flatMap(({ typename, version, jsonSchema }) => {
      try {
        return [Type.makeObject(DXN.make(typename, version))(JsonSchema.toEffectSchema(jsonSchema))];
      } catch {
        // A schema the JSON round trip does not cover costs only that type, not the session.
        return [];
      }
    }),
  );
};

/** Opens the session: the guest database over the host's space. */
export const open = ({ spaceId }: { readonly spaceId: string }): void => {
  session = { db: new BridgeDatabase({ spaceId: SpaceId.make(spaceId), host, registry }) };
};

/** Diagnostics for tests: what crossed the bridge, and how much the working set holds. */
export const stats = () => {
  const { db } = requireSession();
  return { ...db.counters, resident: db.resident };
};

/**
 * Runs one program against the session's database and the host's operations. Never rejects: what
 * the program did wrong is the result, so the host can tell it from a failure of the sandbox.
 */
export const evaluate = async (program: Program, { operations, docs }: EvaluationInit): Promise<EvaluationResult> => {
  const { db } = requireSession();
  try {
    // The host may have changed resident objects since the last program read them.
    await db.refresh();

    const definitions = new Map(
      operations.flatMap(({ key, name, description, backed }) =>
        backed && DXN.isDXN(key) ? [[key, standIn(key, name, description)] as const] : [],
      ),
    );

    Object.assign(globalThis, {
      Effect,
      Database: { ...Database, resolve: resolveWith(definitions) },
      Filter,
      Query,
      Order,
      Obj,
      Relation,
      Ref,
      Type,
      DXN,
      Operation,
      Tools: Object.fromEntries(
        operations
          .filter(({ backed }) => !backed)
          .map(({ name }) => [name, (input: unknown = {}) => callHost(() => host().tool(name, encode(input, db)), db)]),
      ),
      print: (...values: unknown[]) =>
        Effect.sync(() => {
          db.flushSync();
          host().print(values.map((value) => encode(value, db)));
        }),
      DOCS: Object.freeze({ ...docs }),
    });

    // Run as the Effect dialect runs its program, so a failure surfaces as the same error.
    const runtime = Context.make(Database.Service, Database.makeService(db)).pipe(
      Context.add(Operation.Service, forwardOperations(db)),
    );
    const value = await RuntimeProvider.runPromise(Effect.succeed(runtime))(Effect.gen(program));
    db.flushSync();
    return { ok: true, value: encode(value, db) };
  } catch (error) {
    // What the program wrote before it failed still reaches the host, as it would in-process.
    try {
      db.flushSync();
    } catch {}
    return { ok: false, message: describeFailure(error) };
  }
};

/** Places rows the host already holds in the working set. */
export const seed = (rows: Parameters<BridgeDatabase['seed']>[0]): Promise<void> => requireSession().db.seed(rows);

/** Writes pending changes to the host, ahead of a snapshot. */
export const flush = (): void => requireSession().db.flushSync();

/** A host call whose failure is the program's to handle, as an effect. */
const callHost = (call: () => Outcome, db: BridgeDatabase): Effect.Effect<unknown, OperationFailed> =>
  Effect.suspend(() => {
    db.flushSync();
    const outcome = call();
    return outcome.ok
      ? Effect.promise(() => decode(outcome.value, db))
      : Effect.fail(new OperationFailed({ message: outcome.message }));
  });

/**
 * `Operation.invoke` in the guest: the definition is a stand-in carrying the key, and the operation
 * runs on the host, where its handler and the conversation live. Scheduling stays loud.
 */
const forwardOperations = (db: BridgeDatabase): Operation.OperationService => {
  const invoke = (key: string, input: unknown) =>
    callHost(() => host().invoke(key, encode(input, db)), db).pipe(Effect.orDie);
  return {
    invoke: (op, ...[input]) =>
      invoke(String(op.meta.key), input).pipe(Effect.flatMap(Schema.decodeUnknownEffect(op.output)), Effect.orDie),
    schedule: () => Effect.die(new Error('Scheduling an operation is not available inside the sandbox.')),
    invokePromise: (op, ...[input]) =>
      EffectEx.runPromise(
        invoke(String(op.meta.key), input).pipe(Effect.flatMap(Schema.decodeUnknownEffect(op.output)), Effect.orDie),
      ).then(
        (data) => ({ data }),
        (error: unknown) => ({ error: error instanceof Error ? error : new Error(describeFailure(error)) }),
      ),
  };
};

/** A definition naming an operation by key; the real one is code that stays on the host with its handler. */
const standIn = (key: DXN.DXN, name: string, description: string | undefined) =>
  Operation.make({
    // The key is the host's own, carried across the boundary; the literal lives where the real
    // definition is declared, which is what the rule protects.
    // eslint-disable-next-line @dxos/rules/operation-key-shape
    meta: { key, name, description },
    input: Schema.Unknown,
    output: Schema.Unknown,
  });

/** An object's legacy ECHO DXN (`dxn:echo:<space>:<id>`, `@` for this space), which models still write. */
const LEGACY_ECHO_DXN = /^dxn:echo:([A-Z0-9]+|@):([0-9A-Z]{26})$/;

const fromLegacyEchoDXN = (ref: string): URI.URI => {
  const match = LEGACY_ECHO_DXN.exec(ref);
  if (!match) {
    return URI.make(ref);
  }
  const [, space, id] = match;
  return URI.make(space === '@' ? `echo:///${id}` : `echo://${space}/${id}`);
};

/**
 * `Database.resolve`, answering the turn's operations itself (a definition is code, not an entity the
 * registry holds) and sending every other DXN to the real resolver, as the Effect dialect does.
 */
const resolveWith =
  (definitions: ReadonlyMap<string, Operation.Definition.Any>) =>
  (ref: URI.URI | Ref.Ref<Obj.Unknown>, schema?: Type.AnyEntity) => {
    const definition = typeof ref === 'string' ? definitions.get(ref) : undefined;
    if (definition !== undefined) {
      return Effect.succeed(definition);
    }
    const target = typeof ref === 'string' ? fromLegacyEchoDXN(ref) : ref;
    return schema === undefined ? Database.resolve(target) : Database.resolve(target, schema);
  };

/**
 * What the model is told the failure was, read as the in-process sandbox reads it: a typed error
 * carries its detail in its fields rather than in `message`.
 */
const describeFailure = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message.length > 0 ? error.message : [String(error), fields(error)].filter(Boolean).join(' ');
  }
  const text = String(error);
  return text.length > 0 && text !== '[object Object]' ? text : (fields(error) ?? 'Unknown failure.');
};

const fields = (error: unknown): string | undefined => {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }
  try {
    const own = { ...error };
    return Object.keys(own).length > 0 ? JSON.stringify(own) : undefined;
  } catch {
    return undefined;
  }
};
