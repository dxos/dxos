//
// Copyright 2026 DXOS.org
//

// Stub for `tiktoken/lite` — its WASM bundle has a top-level `await` that
// esbuild's dep pre-bundler (used by `vite` in browser test mode) cannot
// rewrap as CJS, so the real module breaks `plugin-kanban:test-browser`
// and other browser tests that transitively import `@anthropic-ai/tokenizer`.
// None of those tests actually exercise tokenization, so aliasing to an
// empty module is safe — matches the same trick used by composer-app's
// vite.config.ts.
export {};
export default {};
