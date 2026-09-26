//
// Copyright 2026 DXOS.org
//

// Loaded before anything else in a page or worker: records every wasm memory the realm creates.

const memories = new Set<WebAssembly.Memory>();
const track = (instance: WebAssembly.Instance): void =>
  Object.values(instance.exports).forEach((value) => value instanceof WebAssembly.Memory && memories.add(value));

const Instance = WebAssembly.Instance;
WebAssembly.Instance = new Proxy(Instance, {
  construct: (target, args, newTarget) => {
    const instance = Reflect.construct(target, args, newTarget);
    track(instance);
    return instance;
  },
});
const instantiate = WebAssembly.instantiate.bind(WebAssembly);
Reflect.set(WebAssembly, 'instantiate', async (...args: Parameters<typeof WebAssembly.instantiate>) => {
  const result: unknown = await Reflect.apply(instantiate, WebAssembly, args);
  if (result instanceof WebAssembly.Instance) {
    track(result);
  } else if (
    typeof result === 'object' &&
    result !== null &&
    'instance' in result &&
    result.instance instanceof WebAssembly.Instance
  ) {
    track(result.instance);
  }
  return result;
});

const instantiateStreaming = WebAssembly.instantiateStreaming.bind(WebAssembly);
Reflect.set(
  WebAssembly,
  'instantiateStreaming',
  async (...args: Parameters<typeof WebAssembly.instantiateStreaming>) => {
    const result = await instantiateStreaming(...args);
    track(result.instance);
    return result;
  },
);

Reflect.set(globalThis, '__wasmBytes', () => [...memories].reduce((sum, memory) => sum + memory.buffer.byteLength, 0));
