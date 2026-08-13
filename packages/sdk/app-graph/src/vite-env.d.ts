//
// Copyright 2026 DXOS.org
//

/**
 * Vite replaces `import.meta.env` at build time. Declared locally, rather than via `vite/client`, because
 * this package also runs outside a bundler (Node, workers) — hence the optional `env`.
 * @see https://vitejs.dev/guide/env-and-mode.html
 */
interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
  /** Opt in to `Atom.withLabel` diagnostic labels, which cost a stack-trace capture per labelled atom. */
  readonly VITE_ATOM_LABELS?: string;
}

interface ImportMeta {
  readonly env?: ImportMetaEnv;
}
