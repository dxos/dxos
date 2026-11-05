//
// Copyright 2026 DXOS.org
//

import { type EdgeFunctionEnv, type SerializedError } from './edge/index.ts';

//
// Plugin protocol: the contract between EDGE and a plugin bundle's Dynamic Worker.
//

// - The bundle's main module exports a `WorkerEntrypoint` implementing {@link Entrypoint}; EDGE calls it over Workers RPC.
// - All types must be trivially serializable (structured clone), except the stubs in `Env` and `InvocationScope`.
// - Workers RPC drops an error's class and stack, so `invoke` returns failures as data instead of throwing.

/**
 * The version of this contract a host speaks. A bundle keeps the host it was published with, so EDGE asks the bundle
 * (`Entrypoint.protocolVersion`) and speaks that version to it.
 *
 * - 1: `describe` and `invoke`; the scope holds `accessTokenService` only; output as structured clone returns it.
 * - 2: the scope's request context, host services and nested operations; output encoded as JSON.
 */
export const PROTOCOL_VERSION = 2;

/** The version of a host that reports none, which predates versioning. */
export const UNVERSIONED = 1;

/** Whether EDGE speaking {@link PROTOCOL_VERSION} can serve a host speaking `version`: any version up to its own. */
export const isSupported = (version: number): boolean =>
  Number.isInteger(version) && version >= UNVERSIONED && version <= PROTOCOL_VERSION;

/** The scope a host speaking `version` reads: fields it does not know are left out, so no stub it never releases is sent. */
export const scopeFor = (version: number, scope: InvocationScope): InvocationScope =>
  version >= 2 ? scope : scope.accessTokenService === undefined ? {} : { accessTokenService: scope.accessTokenService };

/**
 * The bindings EDGE gives a bundle's isolate. They are the same for every space and caller, so one isolate serves them
 * all; each is optional, since an invocation outside a space, or a test, runs without them.
 */
export type Env = Partial<Pick<EdgeFunctionEnv.Env, 'DATA_SERVICE' | 'QUEUE_SERVICE' | 'FUNCTIONS_AI_SERVICE'>> & {
  /** EDGE's registry of the types every published plugin contributes; resolves a type the bundle does not hold. */
  readonly TYPE_REGISTRY?: TypeRegistry;
};

/** EDGE's registry of published types, keyed by DXN. */
export interface TypeRegistry {
  /**
   * The type with this typename, from the first published bundle that contributes it; `version` narrows it to that
   * version. Undefined when no published bundle contributes it.
   */
  resolveType(typename: string, version?: string): Promise<TypeRecord | undefined>;
}

/** One invocation of an operation the bundle's primary plugin handles. */
export type InvokeRequest = {
  /** The operation's key, bare (`org.example.op`) or as a DXN (`dxn:org.example.op`). */
  readonly operationKey: string;
  readonly input?: unknown;
  /** The space the operation runs in; without one it gets no database. */
  readonly spaceId?: string;
};

/**
 * What differs between two calls to the same isolate, passed with each call rather than in `env`. Every field is
 * optional: a host reads only the fields its {@link PROTOCOL_VERSION} knows, and EDGE sends a host only those.
 */
export type InvocationScope = {
  /** Mints the caller's credentials; bound by EDGE to this caller and space. */
  readonly accessTokenService?: EdgeFunctionEnv.AccessTokenService;
  /** URI of the chat or feed of the agent turn that made the call; handlers get its `HarnessService`. Version 2. */
  readonly conversation?: string;
  /** The conversation a channel reply is routed back to, when it differs from `conversation`. Version 2. */
  readonly origin?: string;
  /** The identity the invocation acts for; absent for a trigger or a process turn. Version 2. */
  readonly caller?: Caller;
  /** Receives the invocation's trace messages. Version 2. */
  readonly traceSink?: TraceSink;
  /** A process id the caller minted; the caller then owns the start and end envelopes. Version 2. */
  readonly pid?: string;
  /** The invoking process, stamped on every trace message as `meta.parentPid`. Version 2. */
  readonly parentPid?: string;
  /** The run this invocation continues (`Trace.Meta.runId`). Version 2. */
  readonly runId?: string;
  /** Resolves when the caller cancels the invocation. Version 2. */
  readonly cancellation?: CancellationSignal;
  /** TEST-ONLY. Pins the ids the invocation mints. Version 2. */
  readonly idSeed?: IdSeed;
  /** Services only EDGE holds, bound to this invocation's space, caller and conversation. Version 2. */
  readonly services?: HostServices;
  /** Runs an operation the bundle does not handle, re-entering EDGE's router. Version 2. */
  readonly operations?: OperationHost;
};

/** An identity EDGE verified. */
export type Caller = {
  readonly identityKey: string;
  readonly identityDid: string;
};

/** TEST-ONLY. A ULID seed: `time` is the pinned timestamp, `seed` starts the random component's PRNG. */
export type IdSeed = {
  readonly time: number;
  readonly seed: number;
};

/** Where an invocation's trace messages go: each is a `Trace.Message` in `Obj.toJSON` form. */
export interface TraceSink {
  /** Over RPC every call returns a promise; the host drains them before the invocation returns. */
  write(message: object): void | Promise<void>;
}

/** Resolves when the invocation is cancelled; the caller also settles it when the invocation ends. */
export interface CancellationSignal {
  waitForCancel(): Promise<void>;
}

/**
 * A service EDGE serves to the bundle: an Effect service whose methods each return an Effect, or a Stream for those
 * named in `streams`.
 */
export type ServiceDescriptor = {
  /** The service's Effect key, e.g. `@dxos/plugin-discord/DiscordBotService`. */
  readonly key: string;
  readonly streams?: readonly string[];
};

/** The services EDGE serves to one invocation. */
export type HostServices = {
  readonly descriptors: readonly ServiceDescriptor[];
  readonly host: ServiceHost;
};

/** Calls a method of a service EDGE serves; arguments and the result are JSON (ECHO objects in `Obj.toJSON` form). */
export interface ServiceHost {
  call(service: string, method: string, args: readonly unknown[]): Promise<ServiceResult>;
}

/** A method's result, a stream's items as an array; a failure is data, as for `invoke`. */
export type ServiceResult =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly error: Failure };

/** Options of a nested invocation; the caller, trace sink and cancellation are inherited from the outer one. */
export type OperationOptions = {
  readonly spaceId?: string;
  readonly conversation?: string;
  readonly parentPid?: string;
  readonly idSeed?: IdSeed;
};

/** EDGE's router, for operations of other plugins. */
export interface OperationHost {
  invoke(operationKey: string, input: unknown, options: OperationOptions): Promise<InvokeResult>;
}

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
  /**
   * The handler's error as `ErrorCodec` encodes it, cause chain included, which EDGE rethrows so a caller sees the
   * error operation-service would have raised. Version 2.
   */
  readonly encoded?: SerializedError;
};

export type InvokeResult =
  | { readonly ok: true; readonly output: unknown }
  | { readonly ok: false; readonly error: Failure };

/** A plugin the bundle activates. */
export type PluginRecord = {
  readonly key: string;
  readonly name?: string;
};

/** A skill as data: its instructions are resolved, since their `Text` lives in no database. */
export type SkillRecord = {
  readonly key: string;
  readonly name: string;
  readonly description?: string;
  readonly instructions?: string;
  readonly mcpPrompt: boolean;
  readonly tools: readonly string[];
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
  readonly operations: readonly object[];
  readonly skills: readonly SkillRecord[];
  readonly types: readonly TypeRecord[];
  readonly failures: readonly FailureRecord[];
  /** The {@link PROTOCOL_VERSION} of the host that produced the catalog; absent before versioning. */
  readonly protocolVersion?: number;
};

/** The RPC surface of a plugin bundle's Dynamic Worker. */
export interface Entrypoint {
  /** Activates the plugin, once per isolate, and returns what it contributes; rejects only if the host cannot start. */
  describe(): Promise<Catalog>;
  /** Runs an operation of the primary plugin. */
  invoke(request: InvokeRequest, scope?: InvocationScope): Promise<InvokeResult>;
  /** The {@link PROTOCOL_VERSION} of the bundle's host, without activating the plugin. */
  protocolVersion(): Promise<number>;
}
