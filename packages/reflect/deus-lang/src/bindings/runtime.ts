//
// Copyright 2026 DXOS.org
//

// The runtime of generated TypeScript bindings (`deus bindings`, D81). `deus bindings` copies this
// file next to the module it writes, so the output needs nothing from this package: it drives the
// embeddable wasm kernel (docs/spec/EMBEDDING.md) and converts values with the codecs below.

/** A DEUS value as it crosses the embedding boundary (EMBEDDING.md, "Values as JSON"). */
export type Json = null | boolean | number | string | readonly Json[] | Con;

/** A constructed value: `$` names its type (an IRI or a hash), `tag` its constructor. */
export type Con = { readonly $: string; readonly tag: number; readonly fields: readonly Json[] };

export type Awaitable<T> = T | Promise<T>;

/** Converts between a TypeScript value and its JSON encoding, in both directions. */
export type Codec<T> = { readonly encode: (value: T) => Json; readonly decode: (json: Json) => T };

/** Answers operation `op` of one ability, given its JSON arguments. */
export type Answer = (op: number, args: readonly Json[]) => Awaitable<Json>;

/** A DEUS defect nothing caught; `trace` names the definitions it passed through, innermost first. */
export class DeusDefect extends Error {
  readonly trace: readonly string[];

  constructor(message: string, trace: readonly string[]) {
    super(message);
    this.name = 'DeusDefect';
    this.trace = trace;
  }
}

/** A value that does not have the shape its static DEUS type promises. */
export class DeusDecodeError extends Error {
  constructor(expected: string, json: Json | undefined) {
    super(`expected ${expected}, got ${JSON.stringify(json)}`);
    this.name = 'DeusDecodeError';
  }
}

const isCon = (json: Json | undefined): json is Con =>
  typeof json === 'object' && json !== null && !Array.isArray(json) && '$' in json;

const isArray = (json: Json | undefined): json is readonly Json[] => Array.isArray(json);

/** The constructed value `json`, checked. */
export const con = (json: Json, type: string): Con => {
  if (!isCon(json)) {
    throw new DeusDecodeError(type, json);
  }
  return json;
};

/** Field `index` of a constructed value, checked. */
export const field = (value: Con, index: number): Json => {
  const json = value.fields[index];
  if (json === undefined) {
    throw new DeusDecodeError(`field ${index} of ${value.$}`, undefined);
  }
  return json;
};

/** Argument `index` of a request, checked. */
export const arg = (args: readonly Json[], index: number): Json => {
  const json = args[index];
  if (json === undefined) {
    throw new DeusDecodeError(`argument ${index}`, undefined);
  }
  return json;
};

export const make = (type: string, tag: number, fields: readonly Json[]): Con => ({ $: type, tag, fields });

export const badTag = (type: string, value: Con): DeusDecodeError =>
  new DeusDecodeError(`a constructor of ${type}`, value);

export const int: Codec<number> = {
  // DEUS `Int` is 32-bit; the kernel wraps larger numbers the same way.
  encode: (value) => value | 0,
  decode: (json) => {
    if (typeof json !== 'number') {
      throw new DeusDecodeError('Int', json);
    }
    return json;
  },
};

export const text: Codec<string> = {
  encode: (value) => value,
  decode: (json) => {
    if (typeof json !== 'string') {
      throw new DeusDecodeError('Text', json);
    }
    return json;
  },
};

export const bool: Codec<boolean> = {
  encode: (value) => value,
  decode: (json) => {
    if (typeof json !== 'boolean') {
      throw new DeusDecodeError('Bool', json);
    }
    return json;
  },
};

export const unit: Codec<void> = {
  encode: () => null,
  decode: () => undefined,
};

export const list = <T>(item: Codec<T>): Codec<readonly T[]> => ({
  encode: (values) => values.map(item.encode),
  decode: (json) => {
    if (!isArray(json)) {
      throw new DeusDecodeError('List', json);
    }
    return json.map(item.decode);
  },
});

const OPTION = 'urn:deus:builtin:Option';

/** `Option a` is `A | undefined`; the generator refuses `Option` of a type that can itself be `undefined`. */
export const option = <T>(item: Codec<T>): Codec<T | undefined> => ({
  encode: (value) => (value === undefined ? make(OPTION, 0, []) : make(OPTION, 1, [item.encode(value)])),
  decode: (json) => {
    const value = con(json, 'Option');
    return value.tag === 0 ? undefined : item.decode(field(value, 0));
  },
});

const PAIR = 'urn:deus:builtin:Pair';

/** `(a, b)` is `[A, B]`. */
export const pair = <A, B>(first: Codec<A>, second: Codec<B>): Codec<readonly [A, B]> => ({
  encode: ([a, b]) => make(PAIR, 0, [first.encode(a), second.encode(b)]),
  decode: (json) => {
    const value = con(json, 'Pair');
    return [first.decode(field(value, 0)), second.decode(field(value, 1))];
  },
});

/** `(a, b, c)`, which DEUS nests as `(a, (b, c))`, is `[A, B, C]`. */
export const triple = <A, B, C>(a: Codec<A>, b: Codec<B>, c: Codec<C>): Codec<readonly [A, B, C]> => {
  const nested = pair(a, pair(b, c));
  return {
    encode: ([x, y, z]) => nested.encode([x, [y, z]]),
    decode: (json) => {
      const [x, [y, z]] = nested.decode(json);
      return [x, y, z];
    },
  };
};

/** The arguments of a function of several parameters, as the right-nested pair its adapter matches. */
export const args = (values: readonly Json[]): Json =>
  values.reduceRight<Json | undefined>(
    (rest, value) => (rest === undefined ? value : make(PAIR, 0, [value, rest])),
    undefined,
  ) ?? null;

/** What a host answers for the built-in `IO` ability. */
export type IoHost = {
  readonly print?: (text: string) => Awaitable<void>;
  readonly eprint?: (text: string) => Awaitable<void>;
  readonly getEnv?: (name: string) => Awaitable<string | undefined>;
};

const IO = 'urn:deus:builtin:IO';

/** `IO` for embedded code: printing, clocks and the environment; no files or processes. */
const ioAnswer =
  (host: IoHost, started: number): Answer =>
  async (op, values) => {
    const arg = values[0] ?? null;
    switch (op) {
      case 0:
        await (host.print ?? ((value: string) => console.log(value.replace(/\n$/, ''))))(text.decode(arg));
        return null;
      case 1:
        await (host.eprint ?? ((value: string) => console.error(value.replace(/\n$/, ''))))(text.decode(arg));
        return null;
      case 10:
        return Date.now() - started;
      case 13:
        return option(text).encode(host.getEnv ? await host.getEnv(text.decode(arg)) : undefined);
      case 15:
        // Nanoseconds do not fit a 32-bit Int, so `wallClock` answers text (D35).
        return (BigInt(Date.now()) * 1_000_000n).toString();
      default:
        throw new Error(`IO operation ${op} is not available to embedded DEUS code`);
    }
  };

type KernelExports = {
  readonly memory: WebAssembly.Memory;
  readonly deus_alloc: (length: number) => number;
  readonly deus_free: (pointer: number, length: number) => void;
  readonly deus_start: (...pointers: number[]) => number;
  readonly deus_resume: (pointer: number, length: number) => number;
  readonly deus_output: () => number;
};

type Result =
  | { readonly state: 'done'; readonly value: Json }
  | {
      readonly state: 'suspend';
      readonly ability: string;
      readonly hash: string;
      readonly op: number;
      readonly args: readonly Json[];
    }
  | { readonly state: 'defect'; readonly message: string; readonly trace: readonly string[] }
  | { readonly state: 'panic'; readonly message: string }
  | { readonly state: 'exit'; readonly code: number };

const isKernel = (value: WebAssembly.Exports): value is WebAssembly.Exports & KernelExports =>
  value.memory instanceof WebAssembly.Memory &&
  ['deus_alloc', 'deus_free', 'deus_start', 'deus_resume', 'deus_output'].every(
    (name) => typeof value[name] === 'function',
  );

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** One kernel instance; it holds at most one run (EMBEDDING.md, "Instances and runs"). */
class Instance {
  readonly #kernel: KernelExports;

  constructor(kernel: KernelExports) {
    this.#kernel = kernel;
  }

  start(image: string, entry: string, argument: Json): Result {
    return this.#call(this.#kernel.deus_start, [image, entry, JSON.stringify(argument)]);
  }

  resume(answer: Json): Result {
    return this.#call(this.#kernel.deus_resume, [JSON.stringify(answer)]);
  }

  #call(fn: (...pointers: number[]) => number, inputs: string[]): Result {
    const written = inputs.map((input) => {
      const bytes = encoder.encode(input);
      const pointer = this.#kernel.deus_alloc(bytes.length);
      new Uint8Array(this.#kernel.memory.buffer, pointer, bytes.length).set(bytes);
      return [pointer, bytes.length] as const;
    });
    try {
      const length = fn(...written.flat());
      // Memory may grow during a call, so the view is taken afresh.
      const output = new Uint8Array(this.#kernel.memory.buffer, this.#kernel.deus_output(), length);
      return JSON.parse(decoder.decode(output));
    } finally {
      written.forEach(([pointer, length]) => this.#kernel.deus_free(pointer, length));
    }
  }
}

export type ModuleOptions = {
  /** The kernel: `deus_kernel.wasm`'s bytes, or a compiled module (Workers import one). */
  readonly wasm: BufferSource | WebAssembly.Module;
  /** The image `deus bindings` wrote: every exported definition with its closure. */
  readonly image: string;
  /** Answers for the program's own abilities, keyed by IRI and by hash. */
  readonly abilities: ReadonlyMap<string, Answer>;
  readonly io?: IoHost;
};

/** A loaded image; `call` runs one entry to completion, answering what the program leaves to its host. */
export type DeusModule = { readonly call: (entry: string, argument: Json) => Promise<Json> };

/**
 * Compiles the kernel once. Each call takes an idle instance or makes one, so calls may overlap
 * and a handler may call back into the module while its caller is suspended.
 */
export const loadModule = async ({ wasm, image, abilities, io = {} }: ModuleOptions): Promise<DeusModule> => {
  const module = wasm instanceof WebAssembly.Module ? wasm : await WebAssembly.compile(wasm);
  const idle: Instance[] = [];
  const take = async (): Promise<Instance> => {
    const ready = idle.pop();
    if (ready) {
      return ready;
    }
    const { exports } = await WebAssembly.instantiate(module, {});
    if (!isKernel(exports)) {
      throw new Error('not a DEUS embedding kernel (deus_kernel.wasm)');
    }
    return new Instance(exports);
  };
  const answerIo = ioAnswer(io, Date.now());

  return {
    call: async (entry, argument) => {
      const kernel = await take();
      try {
        let result = kernel.start(image, entry, argument);
        while (result.state === 'suspend') {
          const answer =
            result.ability === IO ? answerIo : (abilities.get(result.ability) ?? abilities.get(result.hash));
          if (!answer) {
            throw new Error(`no handler for ${result.ability} operation ${result.op}`);
          }
          result = kernel.resume(await answer(result.op, result.args));
        }
        switch (result.state) {
          case 'done':
            return result.value;
          case 'defect':
            throw new DeusDefect(result.message, result.trace);
          case 'panic':
            throw new Error(`DEUS kernel panic: ${result.message}`);
          case 'exit':
            throw new Error(`DEUS program exited with ${result.code}`);
        }
      } finally {
        // An abandoned run needs no cleanup: the instance's next `start` replaces it.
        idle.push(kernel);
      }
    },
  };
};
