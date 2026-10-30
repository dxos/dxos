//
// Copyright 2022 DXOS.org
//

// Installed by the entry rather than the modules that read `Symbol.dispose`: per-module output lets a bundler drop
// any one of those, and WebKit has no native symbols.
import '@hazae41/symbol-dispose-polyfill';

export * from './context.ts';
export * from './context-disposed-error.ts';
export * from './promise-utils.ts';
export * from './resource.ts';
export * from './trace-context.ts';
