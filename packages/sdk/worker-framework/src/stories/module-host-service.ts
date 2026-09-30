//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Rpc from 'effect/unstable/rpc/Rpc';
import * as RpcGroup from 'effect/unstable/rpc/RpcGroup';

/**
 * Shape a dynamically loaded module must export as `module`. Plain functions keep the module free of
 * framework imports, so it can be served from any URL (a Vite chunk, a blob, another origin).
 */
export type HostedModule = {
  readonly name: string;
  readonly methods: Record<string, (...args: any[]) => unknown>;
};

export class ModuleInfo extends Schema.Class<ModuleInfo>('ModuleInfo')({
  url: Schema.String,
  name: Schema.optional(Schema.String),
  methods: Schema.Array(Schema.String),
  error: Schema.optional(Schema.String),
}) {}

export class ModuleInvokeError extends Schema.TaggedError<ModuleInvokeError>()('ModuleInvokeError', {
  message: Schema.String,
}) {}

/**
 * Static RPC surface over a dynamic set of modules: the method set is only known after the worker
 * has imported the URLs it was initialized with, so calls are routed by name rather than typed per method.
 */
export class ModuleHostRpcs extends RpcGroup.make(
  Rpc.make('listModules', {
    success: Schema.Array(ModuleInfo),
  }),
  Rpc.make('invoke', {
    payload: {
      module: Schema.String,
      method: Schema.String,
      args: Schema.Array(Schema.Unknown),
    },
    success: Schema.Unknown,
    error: ModuleInvokeError,
  }),
) {}

/** Reverse (worker→client) surface; empty, served only to complete the framework's handshake. */
export class ModuleHostClientRpcs extends RpcGroup.make() {}

/** Init config the tab hands the worker (via `Client.Options.config`). */
export type ModuleHostConfig = {
  moduleUrls: string[];
};
