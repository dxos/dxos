//
// Copyright 2026 DXOS.org
//

// The runtime of generated TypeScript bindings (`deus bindings`, D81, D87). `deus bindings` copies this
// file and its declarations (deus-runtime.d.ts) next to the module it writes, so the output needs
// nothing from this package: it drives the embeddable wasm kernel (docs/spec/EMBEDDING.md) and
// converts values with the codecs below. It is plain JavaScript so any bundler or runtime loads it.

export class DeusDefect extends Error {
  constructor(message, trace) {
    super(message);
    this.name = 'DeusDefect';
    this.trace = trace;
  }
}

export class DeusThrow extends Error {
  constructor(value) {
    super(typeof value === 'string' ? value : JSON.stringify(value));
    this.name = 'DeusThrow';
    this.value = value;
  }
}

export class DeusDecodeError extends Error {
  constructor(expected, json) {
    super(`expected ${expected}, got ${JSON.stringify(json)}`);
    this.name = 'DeusDecodeError';
  }
}

const isCon = (json) => typeof json === 'object' && json !== null && !Array.isArray(json) && '$' in json;

export const con = (json, type) => {
  if (!isCon(json)) {
    throw new DeusDecodeError(type, json);
  }
  return json;
};

export const field = (value, index) => {
  const json = value.fields[index];
  if (json === undefined) {
    throw new DeusDecodeError(`field ${index} of ${value.$}`, undefined);
  }
  return json;
};

export const arg = (args, index) => {
  const json = args[index];
  if (json === undefined) {
    throw new DeusDecodeError(`argument ${index}`, undefined);
  }
  return json;
};

export const make = (type, tag, fields) => ({ $: type, tag, fields });

export const badTag = (type, value) => new DeusDecodeError(`a constructor of ${type}`, value);

const primitive = (name, type) => ({
  encode: (value) => value,
  decode: (json) => {
    if (typeof json !== type) {
      throw new DeusDecodeError(name, json);
    }
    return json;
  },
});

// DEUS `Int` is 32-bit; the kernel wraps larger numbers the same way.
export const int = { ...primitive('Int', 'number'), encode: (value) => value | 0 };

export const text = primitive('Text', 'string');

export const bool = primitive('Bool', 'boolean');

export const unit = { encode: () => null, decode: () => undefined };

export const list = (item) => ({
  encode: (values) => values.map(item.encode),
  decode: (json) => {
    if (!Array.isArray(json)) {
      throw new DeusDecodeError('List', json);
    }
    return json.map(item.decode);
  },
});

const OPTION = 'urn:deus:builtin:Option';

export const option = (item) => ({
  encode: (value) => (value === undefined ? make(OPTION, 0, []) : make(OPTION, 1, [item.encode(value)])),
  decode: (json) => {
    const value = con(json, 'Option');
    return value.tag === 0 ? undefined : item.decode(field(value, 0));
  },
});

const PAIR = 'urn:deus:builtin:Pair';

export const pair = (first, second) => ({
  encode: ([a, b]) => make(PAIR, 0, [first.encode(a), second.encode(b)]),
  decode: (json) => {
    const value = con(json, 'Pair');
    return [first.decode(field(value, 0)), second.decode(field(value, 1))];
  },
});

export const triple = (a, b, c) => {
  const nested = pair(a, pair(b, c));
  return {
    encode: ([x, y, z]) => nested.encode([x, [y, z]]),
    decode: (json) => {
      const [x, [y, z]] = nested.decode(json);
      return [x, y, z];
    },
  };
};

/** Functions passed to DEUS by handle, until the call that passed them ends (EMBEDDING.md, "Functions"). */
const callbacks = new Map();
let nextCallback = 0;
/** The instance and handle of a DEUS function held in TypeScript (see `bindFunctions`). */
const DEUS_FN = Symbol('DEUS function');
/** The instance a call must run on, set on an argument that passes a DEUS function back. */
const OWNER = Symbol('DEUS instance');
/**
 * A function of one parameter. A TypeScript function crosses as `{"$host": n}`, and each call DEUS makes of it
 * comes back as a `Host` request that the run answers with its result. A DEUS function crosses as `{"$fn": n}`
 * and is called asynchronously on the instance that made it; passed back, it is that same function again.
 */
export const fn = (param, result) => ({
  encode: (value) => {
    const held = value[DEUS_FN];
    if (held) {
      const json = { $fn: held.handle };
      Object.defineProperty(json, OWNER, { value: held.owner });
      return json;
    }
    const handle = nextCallback++;
    callbacks.set(handle, async (json) => result.encode(await value(param.decode(json))));
    return { $host: handle };
  },
  decode: (json) => {
    const raw = typeof json === 'function' ? json[DEUS_FN] && json : undefined;
    if (!raw) {
      throw new DeusDecodeError('a DEUS function', json);
    }
    const call = async (value) => result.decode(await raw(param.encode(value)));
    call[DEUS_FN] = raw[DEUS_FN];
    // The typed function keeps the raw one, whose collection releases the handle.
    call.raw = raw;
    return call;
  },
});
/** The one instance the DEUS functions `json` passes back belong to, if it passes any. */
const ownerIn = (json) => {
  const owners = new Set();
  const visit = (value) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
    } else if (typeof value === 'object' && value !== null) {
      if (value[OWNER]) {
        owners.add(value[OWNER]);
      }
      (value.fields ?? []).forEach(visit);
    }
  };
  visit(json);
  if (owners.size > 1) {
    throw new Error('a call passes DEUS functions from two instances, which cannot meet in one run');
  }
  return [...owners][0];
};
/** The handles of the functions `json` passes in, so a call can forget them when it ends. */
const handlesIn = (json) =>
  Array.isArray(json)
    ? json.flatMap(handlesIn)
    : typeof json === 'object' && json !== null
      ? typeof json.$host === 'number'
        ? [json.$host]
        : (json.fields ?? []).flatMap(handlesIn)
      : [];
const HOST = 'urn:deus:builtin:Host';
/** Answers a `Host` request: calls the function its handle names with the argument. */
const answerHost = async (op, values) => {
  const call = callbacks.get(values[0]);
  if (op !== 0 || !call) {
    throw new Error(`no function for Host request ${op} with handle ${JSON.stringify(values[0])}`);
  }
  return call(values[1] ?? null);
};
/** The arguments of a function of several parameters, as the right-nested pair its adapter matches. */
export const args = (values) =>
  values.reduceRight((rest, value) => (rest === undefined ? value : make(PAIR, 0, [value, rest])), undefined) ?? null;

const IO = 'urn:deus:builtin:IO';

/** `IO` for embedded code: printing, clocks and the environment; no files or processes. */
const answerIo = (host, started) => async (op, values) => {
  const value = values[0] ?? null;
  switch (op) {
    case 0:
      await (host.print ?? ((line) => console.log(line.replace(/\n$/, ''))))(text.decode(value));
      return null;
    case 1:
      await (host.eprint ?? ((line) => console.error(line.replace(/\n$/, ''))))(text.decode(value));
      return null;
    case 10:
      return Date.now() - started;
    case 13:
      return option(text).encode(host.getEnv ? await host.getEnv(text.decode(value)) : undefined);
    case 15:
      // Nanoseconds do not fit a 32-bit Int, so `wallClock` answers text (D35).
      return (BigInt(Date.now()) * 1_000_000n).toString();
    default:
      throw new Error(`IO operation ${op} is not available to embedded DEUS code`);
  }
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** One kernel instance; it holds at most one run (EMBEDDING.md, "Instances and runs"). */
const instance = (kernel) => {
  const call = (fn, inputs) => {
    const written = inputs.map((input) => {
      const bytes = encoder.encode(input);
      const pointer = kernel.deus_alloc(bytes.length);
      new Uint8Array(kernel.memory.buffer, pointer, bytes.length).set(bytes);
      return [pointer, bytes.length];
    });
    try {
      const length = fn(...written.flat());
      // Memory may grow during a call, so the view is taken afresh.
      return JSON.parse(decoder.decode(new Uint8Array(kernel.memory.buffer, kernel.deus_output(), length)));
    } finally {
      written.forEach(([pointer, length]) => kernel.deus_free(pointer, length));
    }
  };
  return {
    start: (image, entry, argument) => call(kernel.deus_start, [image, entry, JSON.stringify(argument)]),
    resume: (answer) => call(kernel.deus_resume, [JSON.stringify(answer)]),
    apply: (handle, argument) =>
      call((pointer, length) => kernel.deus_apply(handle, pointer, length), [JSON.stringify(argument)]),
    release: (handle) => kernel.deus_release(handle),
  };
};

/** `deus_kernel.wasm` beside the generated module: read from disk under Node, fetched elsewhere. */
export const kernelNextTo = async (moduleUrl) => {
  const url = new URL('./deus_kernel.wasm', moduleUrl);
  if (url.protocol === 'file:') {
    const { readFile } = await import('node:fs/promises');
    return readFile(url);
  }
  const response = await fetch(url);
  return response.arrayBuffer();
};

/**
 * Compiles the kernel once. Each call takes an idle instance or makes one, so calls may overlap
 * and a handler may call back into the module while its caller is suspended.
 */
export const loadModule = async ({ wasm, image, abilities, io = {} }) => {
  const module = wasm instanceof WebAssembly.Module ? wasm : await WebAssembly.compile(wasm);
  const idle = [];
  const take = async () => {
    const ready = idle.pop();
    if (ready) {
      return ready;
    }
    const { exports } = await WebAssembly.instantiate(module, {});
    if (typeof exports.deus_start !== 'function') {
      throw new Error('not a DEUS embedding kernel (deus_kernel.wasm)');
    }
    return instance(exports);
  };
  const io$ = answerIo(io, Date.now());

  /** Answers each operation the run leaves unhandled until it ends; its value, or the failure thrown. */
  const drive = async (kernel, first) => {
    let result = first;
    while (result.state === 'suspend') {
      const answer =
        result.ability === IO
          ? io$
          : result.ability === HOST
            ? answerHost
            : (abilities.get(result.ability) ?? abilities.get(result.hash));
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
      case 'exit':
        throw new Error(`DEUS program exited with ${result.code}`);
      default:
        throw new Error(`DEUS kernel panic: ${result.message}`);
    }
  };

  // An instance whose functions TypeScript holds stays out of the pool, runs one call at a time, and returns
  // to the pool once every such function is collected.
  const owners = new Map();
  const ownerOf = (kernel) => {
    let owner = owners.get(kernel);
    if (!owner) {
      owner = { kernel, live: 0, queue: Promise.resolve() };
      owners.set(kernel, owner);
    }
    return owner;
  };
  const settle = (owner) => {
    if (owner.live === 0 && !owner.busy) {
      owners.delete(owner.kernel);
      idle.push(owner.kernel);
    }
  };
  const collected = new FinalizationRegistry(({ owner, handle }) => {
    owner.kernel.release(handle);
    owner.live--;
    settle(owner);
  });
  /** `json` with each `{"$fn": n}` made a function that applies handle `n` on `owner`. */
  const bindFunctions = (owner, json) => {
    if (Array.isArray(json)) {
      return json.map((item) => bindFunctions(owner, item));
    }
    if (typeof json !== 'object' || json === null) {
      return json;
    }
    if (typeof json.$fn === 'number') {
      const handle = json.$fn;
      const raw = (argument) => exclusive(owner, () => drive(owner.kernel, owner.kernel.apply(handle, argument)));
      raw[DEUS_FN] = { owner, handle };
      owner.live++;
      collected.register(raw, { owner, handle });
      return raw;
    }
    return json.fields ? { ...json, fields: json.fields.map((item) => bindFunctions(owner, item)) } : json;
  };
  /** Runs `body` on `owner`'s instance after its earlier calls, binding the functions its value holds. */
  const exclusive = (owner, body) => {
    const turn = owner.queue.then(async () => {
      owner.busy = true;
      try {
        return bindFunctions(owner, await body());
      } finally {
        owner.busy = false;
        settle(owner);
      }
    });
    owner.queue = turn.catch(() => {});
    return turn;
  };

  return {
    call: async (entry, argument) => {
      const owner = ownerIn(argument);
      try {
        if (owner) {
          return await exclusive(owner, () => drive(owner.kernel, owner.kernel.start(image, entry, argument)));
        }
        const kernel = await take();
        const fresh = ownerOf(kernel);
        // The instance stays out of the pool until the call ends and its functions are collected.
        return await exclusive(fresh, () => drive(kernel, kernel.start(image, entry, argument)));
      } finally {
        // A run's TypeScript functions cannot outlive it.
        handlesIn(argument).forEach((handle) => callbacks.delete(handle));
      }
    },
  };
};
