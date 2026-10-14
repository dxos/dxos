//
// Copyright 2026 DXOS.org
//

// The JS side of the embedding API (src/embed.rs): loads the wasm32-unknown-unknown kernel and
// drives a run, answering each operation the program leaves unhandled with `handle`, which may
// be asynchronous. Runs in Cloudflare Workers, browsers and Node.

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** A kernel instance; `module` is a `WebAssembly.Module` (Workers import one) or wasm bytes. */
export const createKernel = async (module) => {
  const { instance } =
    module instanceof WebAssembly.Module
      ? { instance: await WebAssembly.instantiate(module, {}) }
      : await WebAssembly.instantiate(module, {});
  const exports = instance.exports;

  const write = (text) => {
    const bytes = encoder.encode(text);
    const pointer = exports.deus_alloc(bytes.length);
    new Uint8Array(exports.memory.buffer, pointer, bytes.length).set(bytes);
    return [pointer, bytes.length];
  };
  const read = (length) =>
    JSON.parse(decoder.decode(new Uint8Array(exports.memory.buffer, exports.deus_output(), length)));
  const call = (fn, inputs) => {
    const written = inputs.map(write);
    try {
      return read(fn(...written.flat()));
    } finally {
      written.forEach(([pointer, length]) => exports.deus_free(pointer, length));
    }
  };

  return {
    start: (image, entry, argument) => call(exports.deus_start, [image, entry ?? '', JSON.stringify(argument ?? null)]),
    resume: (answer) => call(exports.deus_resume, [JSON.stringify(answer ?? null)]),
  };
};

/**
 * Runs `entry` (default: the image's main) with `argument` until it finishes, awaiting
 * `handle(ability, op, args)` for each operation the program leaves to its host.
 */
export const run = async (kernel, image, { entry, argument, handle }) => {
  let result = kernel.start(image, entry, argument);
  while (result.state === 'suspend') {
    result = kernel.resume(await handle(result.ability, result.op, result.args));
  }
  return result;
};
