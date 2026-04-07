//
// Copyright 2026 DXOS.org
//

/**
 * Same shape as `@dxos/swc-log-plugin` / `to_transform` in Vitest and Vite React configs.
 */
// TODO(dmaretskyi): Move those to ./definitions (and move types that are in index.ts )
export interface LogMetaTransformSpec {
  name: string;
  package: string;
  param_index: number;
  include_args: boolean;
  include_call_site: boolean;
  include_scope: boolean;
}

export interface LogMetaTransformOptions {
  /** Overrides the path embedded as `__dxlog_file`; defaults to the module `id`. */
  filename?: string;
  /** Same as SWC plugin `to_transform`. */
  to_transform: LogMetaTransformSpec[];
  /**
   * Skip modules whose id matches (default: `node_modules`, `\0` virtual).
   * @default /node_modules|\\0/
   */
  excludeId?: RegExp;
}
