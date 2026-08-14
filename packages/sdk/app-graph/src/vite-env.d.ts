//
// Copyright 2026 DXOS.org
//

/**
 * Declared locally rather than via `vite/client`, and with `env` optional, because this package also runs
 * outside a bundler (Node, workers) where Vite never substitutes it.
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
