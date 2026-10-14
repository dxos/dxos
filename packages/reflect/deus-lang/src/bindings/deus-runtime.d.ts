//
// Copyright 2026 DXOS.org
//

// Declarations of deus-runtime.js, the runtime `deus bindings` copies next to every module it writes.

/** A value a handler may return synchronously or as a promise. */
export type Awaitable<T> = T | Promise<T>;

/** What the host answers for DEUS's built-in `IO` ability; the defaults print to the console. */
export interface IoHost {
  readonly print?: (text: string) => Awaitable<void>;
  readonly eprint?: (text: string) => Awaitable<void>;
  readonly getEnv?: (name: string) => Awaitable<string | undefined>;
}

/** A DEUS defect nothing caught (division by zero, a failed match, `defect "…"`). */
export declare class DeusDefect extends Error {
  /** Definitions the defect passed through, innermost first. */
  readonly trace: readonly string[];
  constructor(message: string, trace: readonly string[]);
}

/** A `Throw` the DEUS code left to its host, when no `Throw` handler was given. */
export declare class DeusThrow extends Error {
  /** The thrown value. */
  readonly value: unknown;
  constructor(value: unknown);
}

/** A value that does not have the shape its DEUS type promises. */
export declare class DeusDecodeError extends Error {
  constructor(expected: string, json: unknown);
}

/** A DEUS value as it crosses the embedding boundary (EMBEDDING.md, "Values as JSON"). */
export type Json = null | boolean | number | string | readonly Json[] | Con;

/** A constructed value: `$` names its type (an IRI or a hash), `tag` its constructor. */
export interface Con {
  readonly $: string;
  readonly tag: number;
  readonly fields: readonly Json[];
}

/** Converts between a TypeScript value and its JSON encoding. */
export interface Codec<T> {
  readonly encode: (value: T) => Json;
  readonly decode: (json: Json) => T;
}

/** Answers operation `op` of one ability, given its JSON arguments. */
export type Answer = (op: number, args: readonly Json[]) => Awaitable<Json>;

export declare const con: (json: Json, type: string) => Con;
export declare const field: (value: Con, index: number) => Json;
export declare const arg: (args: readonly Json[], index: number) => Json;
export declare const make: (type: string, tag: number, fields: readonly Json[]) => Con;
export declare const badTag: (type: string, value: Con) => DeusDecodeError;
export declare const int: Codec<number>;
export declare const text: Codec<string>;
export declare const bool: Codec<boolean>;
export declare const unit: Codec<void>;
export declare const list: <T>(item: Codec<T>) => Codec<readonly T[]>;
export declare const option: <T>(item: Codec<T>) => Codec<T | undefined>;
export declare const pair: <A, B>(first: Codec<A>, second: Codec<B>) => Codec<readonly [A, B]>;
export declare const triple: <A, B, C>(a: Codec<A>, b: Codec<B>, c: Codec<C>) => Codec<readonly [A, B, C]>;
export declare const args: (values: readonly Json[]) => Json;
export declare const kernelNextTo: (moduleUrl: string) => Promise<BufferSource>;

export interface ModuleOptions {
  readonly wasm: BufferSource | WebAssembly.Module;
  readonly image: string;
  readonly abilities: ReadonlyMap<string, Answer>;
  readonly io?: IoHost;
}

export interface DeusModule {
  readonly call: (entry: string, argument: Json) => Promise<Json>;
}

export declare const loadModule: (options: ModuleOptions) => Promise<DeusModule>;
