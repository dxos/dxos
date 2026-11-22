//
// Copyright 2026 DXOS.org
//

import * as Rpc from 'effect/rpc/Rpc';
import * as RpcGroup from 'effect/rpc/RpcGroup';
import * as Schema from 'effect/Schema';

import { ClientServicesRpcs } from '@dxos/client-protocol';
import type { JsonSchema } from '@dxos/echo';

/** Document id to Automerge heads. */
const DocumentHeads = Schema.Record(Schema.String, Schema.mutable(Schema.Array(Schema.String)));

/**
 * What the worker needs from the host beyond ECHO itself.
 *
 * The database reaches the worker over {@link ClientServicesRpcs}, unchanged — an out-of-process
 * sandbox is just another client, so there is nothing to invent there. These calls are what
 * that boundary has no service for: the turn's output buffer, the skills' operations (whose
 * handlers live here with the conversation), and the evaluation's own result.
 */
export const SandboxHostRpcs = RpcGroup.make(
  // Printed forms, not values: the code's values include live objects, which cannot cross the port.
  Rpc.make('Sandbox.print', {
    payload: Schema.Struct({ values: Schema.Array(Schema.String) }),
    success: Schema.Void,
  }),
  Rpc.make('Sandbox.invokeOperation', {
    payload: Schema.Struct({ key: Schema.String, input: Schema.Any }),
    // The operation's own failure is data, not an RPC failure: the model's next move is to read it
    // and write different code, exactly as it would for a throw.
    success: Schema.Union([
      Schema.Struct({ _tag: Schema.Literal('Ok'), value: Schema.Any }),
      Schema.Struct({ _tag: Schema.Literal('Error'), message: Schema.String }),
    ]),
  }),
  // `Operation.invoke` from the worker; values are `Wire`-encoded, and heads let the reader catch up first.
  Rpc.make('Sandbox.invokeDefinition', {
    payload: Schema.Struct({ key: Schema.String, input: Schema.Any, heads: DocumentHeads }),
    success: Schema.Union([
      Schema.Struct({ _tag: Schema.Literal('Ok'), value: Schema.Any, heads: DocumentHeads }),
      Schema.Struct({ _tag: Schema.Literal('Error'), message: Schema.String }),
    ]),
  }),
  Rpc.make('Sandbox.complete', {
    payload: Schema.Struct({
      /** The result's printed form, since the host only prints it. */
      value: Schema.UndefinedOr(Schema.String),
      failure: Schema.NullOr(Schema.String),
      heads: DocumentHeads,
    }),
    success: Schema.Void,
  }),
  // The host's working set for the space (`WorkingSetService`), which the worker's database opens from and reports
  // to, so it reads the writes the index does not hold yet. Rows carry document bytes, which a port clones as they are.
  Rpc.make('Sandbox.workingSetGet', {
    success: Schema.Any,
  }),
  Rpc.make('Sandbox.workingSetPut', {
    payload: Schema.Struct({ report: Schema.Any }),
    success: Schema.Void,
  }),
  // A type the worker's registry does not hold, resolved by the host as its own database resolves it (on EDGE, from
  // the published types), as the {@link SandboxType} the worker rebuilds it from; null when the host has none.
  Rpc.make('Sandbox.resolveType', {
    payload: Schema.Struct({ uri: Schema.String }),
    success: Schema.NullOr(Schema.Any),
  }),
);

/** A registered type as schema rather than as the class a worker cannot receive. */
export type SandboxType = SandboxInit['types'][number];

/**
 * The whole contract the worker speaks: the client services it would speak anywhere, plus the few
 * calls above. One group, one port, one client — the worker is a client of both halves, because
 * every call runs host-ward.
 */
export class SandboxRpcs extends RpcGroup.make().merge(ClientServicesRpcs, SandboxHostRpcs) {}

/** What the host hands a freshly spawned worker, before any call is made. */
export type SandboxInit = {
  /** The body of an async function, as the dialect wrapped it. */
  readonly code: string;
  /** Selects the dialect the worker rebuilds its bindings from. */
  readonly dialect: string;
  /**
   * The names the dialect binds in the code's scope, for a runtime that compiles the code before it builds the
   * bindings: workerd has no `eval`, so its program is a module written ahead of loading.
   */
  readonly names: readonly string[];
  /**
   * How each side's writes reach the other. `heads`: the writer reports the root's heads and the reader waits for them.
   * `flush`: the writer flushes and the host refreshes its documents from the store, for services that can neither
   * report heads nor wait for them (EDGE's), which write through to a store and push no client's writes to another.
   */
  readonly handover: 'heads' | 'flush';
  /** Whether the host keeps a working set for the space, which the worker's database then opens over. */
  readonly workingSet: boolean;
  /** Which database to open, named the way the host's own client names it. */
  readonly space: { readonly spaceId: string; readonly spaceKey: string; readonly rootUrl: string };
  /** Every registered type, as schema rather than as the class the worker cannot receive. */
  readonly types: readonly {
    readonly typename: string;
    readonly version: string;
    readonly jsonSchema: JsonSchema.JsonSchema;
    /** The type's `Skill.SkillsAnnotation`, which the JSON-schema round trip drops. */
    readonly skills?: readonly string[];
  }[];
  /** Keys of the skills the conversation has bound; see `BindingsContext.skills`. */
  readonly skills?: readonly string[];
  /** The operations the conversation's skills bind, as the model is told about them. */
  readonly operations: readonly {
    readonly key: string;
    readonly name: string;
    readonly description?: string;
    /** As the dialect renders it into the prompt: JSON schema, already plain data. */
    readonly parameters: unknown;
    /** Whether an operation backs it; an MCP server's tool has none, so the dialect binds it by name. */
    readonly backed: boolean;
  }[];
};
