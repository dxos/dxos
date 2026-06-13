// Stub runtime entry for @dxos/app-framework/meta.
// The actual `#meta` module is a virtual module synthesized at build time by
// the dx-compile esbuild plugin (for lib builds) or the composerPlugin vite
// plugin (for app builds). This file exists only so rolldown can resolve the
// `./meta` export under non-`types` conditions without erroring.
export {};
