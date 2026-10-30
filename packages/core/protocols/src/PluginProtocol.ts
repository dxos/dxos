//
// Copyright 2026 DXOS.org
//

import { type EdgeFunctionEnv } from './edge/index.ts';

//
// Plugin protocol: the contract between EDGE and a plugin bundle's Dynamic Worker.
//

// - The bundle's main module exports a `WorkerEntrypoint` implementing {@link Entrypoint}; EDGE calls it over Workers RPC.
// - All types must be trivially serializable (structured clone), except the stubs in `Env` and `InvocationScope`.
// - Workers RPC drops an error's class and stack, so `invoke` returns failures as data instead of throwing.

/**
 * The bindings EDGE gives a bundle's isolate. They are the same for every space and caller, so one isolate serves them
 * all; each is optional, since an invocation outside a space, or a test, runs without them.
 */
export type Env = Partial<Pick<EdgeFunctionEnv.Env, 'DATA_SERVICE' | 'QUEUE_SERVICE' | 'FUNCTIONS_AI_SERVICE'>>;

/** One invocation of an operation the bundle's primary plugin handles. */
export type InvokeRequest = {
  /** The operation's key, bare (`org.example.op`) or as a DXN (`dxn:org.example.op`). */
  readonly operationKey: string;
  readonly input?: unknown;
  /** The space the operation runs in; without one it gets no database. */
  readonly spaceId?: string;
};

/** What differs between two calls to the same isolate, passed with each call rather than in `env`. */
export type InvocationScope = {
  /** Mints the caller's credentials; bound by EDGE to this caller and space. */
  readonly accessTokenService?: EdgeFunctionEnv.AccessTokenService;
};

/** Why an invocation failed. */
export type ErrorCode =
  /** The primary plugin handles no operation with the key. */
  | 'operation-not-found'
  /** The request is malformed, or names a space the isolate has no bindings for. */
  | 'invalid-request'
  /** The plugin failed to activate, or the handler failed. */
  | 'failed';

export type Failure = {
  readonly code: ErrorCode;
  readonly message: string;
  /** The error's name, e.g. a handler's typed error tag. */
  readonly name?: string;
  readonly stack?: string;
};

export type InvokeResult =
  | { readonly ok: true; readonly output: unknown }
  | { readonly ok: false; readonly error: Failure };

/** A plugin the bundle activates. */
export type PluginRecord = {
  readonly key: string;
  readonly name?: string;
};

/** A skill hook, by the key of the operation it runs. */
export type SkillHookRecord = {
  readonly phase: string;
  readonly operation: string;
  readonly input?: Record<string, unknown>;
};

/** A skill as data: its instructions are resolved, since their `Text` lives in no database. */
export type SkillRecord = {
  readonly key: string;
  readonly name: string;
  readonly description?: string;
  readonly instructions?: string;
  readonly mcpPrompt: boolean;
  readonly tools: readonly string[];
  readonly hooks: readonly SkillHookRecord[];
};

/** An ECHO type the bundle contributes. */
export type TypeRecord = {
  readonly typename: string;
  readonly version: string;
  readonly jsonSchema: object;
};

/** A plugin module that failed to load or activate; a bundle with any is not fit to publish. */
export type FailureRecord = {
  readonly id: string;
  readonly phase: string;
  readonly reason: string;
  readonly message: string;
};

/**
 * What a bundle contributes on EDGE, as JSON: read by the registry, the router and MCP without starting an isolate.
 * Operations are `PersistentOperation` objects in `Obj.toJSON` form; a consumer hydrates them with `Obj.fromJSON`.
 */
export type Catalog = {
  /** The plugin the bundle publishes; everything else in the catalog is its own. */
  readonly plugin: PluginRecord;
  /** Plugins of its `dependsOn` closure, activated beside it. */
  readonly dependencies: readonly PluginRecord[];
  readonly operations: readonly object[];
  readonly skills: readonly SkillRecord[];
  readonly types: readonly TypeRecord[];
  readonly failures: readonly FailureRecord[];
};

/** The RPC surface of a plugin bundle's Dynamic Worker. */
export interface Entrypoint {
  /** Activates the plugin, once per isolate, and returns what it contributes; rejects only if the host cannot start. */
  describe(): Promise<Catalog>;
  /** Runs an operation of the primary plugin. */
  invoke(request: InvokeRequest, scope?: InvocationScope): Promise<InvokeResult>;
}
