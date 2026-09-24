//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Rpc from 'effect/unstable/rpc/Rpc';
import * as RpcGroup from 'effect/unstable/rpc/RpcGroup';

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
  Rpc.make('Sandbox.print', {
    payload: Schema.Struct({ values: Schema.Array(Schema.Any) }),
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
  // `Operation.invoke` from the worker: runs the definition through the turn's `Operation.Service`
  // as in-process code would, so input and output carry live objects in the `Wire` encoding.
  // Each side sends the heads of what it wrote, so the other reads only after catching up.
  Rpc.make('Sandbox.invokeDefinition', {
    payload: Schema.Struct({ key: Schema.String, input: Schema.Any, heads: DocumentHeads }),
    success: Schema.Union([
      Schema.Struct({ _tag: Schema.Literal('Ok'), value: Schema.Any, heads: DocumentHeads }),
      Schema.Struct({ _tag: Schema.Literal('Error'), message: Schema.String }),
    ]),
  }),
  Rpc.make('Sandbox.complete', {
    payload: Schema.Struct({
      value: Schema.Any,
      failure: Schema.NullOr(Schema.String),
      heads: DocumentHeads,
    }),
    success: Schema.Void,
  }),
);

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
  /** Which database to open, named the way the host's own client names it. */
  readonly space: { readonly spaceId: string; readonly spaceKey: string; readonly rootUrl: string };
  /** Every registered type, as schema rather than as the class the worker cannot receive. */
  readonly types: readonly {
    readonly typename: string;
    readonly version: string;
    readonly jsonSchema: JsonSchema.JsonSchema;
  }[];
  /** The operations the conversation's skills bind, as the model is told about them. */
  readonly operations: readonly {
    readonly key: string;
    readonly name: string;
    readonly description?: string;
    /** As the dialect renders it into the prompt: JSON schema, already plain data. */
    readonly parameters: unknown;
  }[];
};
