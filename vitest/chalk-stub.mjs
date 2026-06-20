//
// Copyright 2026 DXOS.org
//

// Stub for `chalk` — `@dxos/log` imports it for terminal coloring. Chalk 4
// runs `supports-color` detection at import time, which probes `tty` /
// `process.stdout` APIs that the `workerd` runtime only partially implements;
// under the `@cloudflare/vitest-pool-workers` pool this crashes the runtime
// with a native segfault. Coloring is meaningless inside the worker test
// runtime, so we alias `chalk` to a chainable identity proxy: every property
// access (`chalk.red`, `chalk.bold.green`, `chalk[name]`) yields a function
// that returns its argument unchanged.

const concat = (...args) => args.map(String).join('');

const handler = {
  // `chalk.red`, `chalk.bold`, `chalk['grey']`, … → another callable proxy so
  // styles chain (`chalk.bold.red('x')`) and terminate as identity functions.
  get: () => proxy,
  // `chalk.red('x')` / `chalk('x')` → 'x'.
  apply: (_target, _thisArg, args) => concat(...args),
};

const proxy = new Proxy(concat, handler);

export default proxy;
