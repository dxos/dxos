//
// Copyright 2026 DXOS.org
//

/**
 * Same shape as `@dxos/swc-log-plugin` / `to_transform` in Vitest and Vite React configs.
 */
export interface LogMetaTransformSpec {
  name: string;
  package: string;
  param_index: number;
  include_args: boolean;
  include_call_site: boolean;
  include_scope: boolean;
}

/**
 * Default `to_transform` list (Composer / `tools/dx-compile` SWC plugin parity).
 */
export const DEFAULT_LOG_META_TRANSFORM_SPEC: LogMetaTransformSpec[] = [
  {
    name: 'log',
    package: '@dxos/log',
    param_index: 2,
    include_args: false,
    include_call_site: true,
    include_scope: true,
  },
  {
    name: 'dbg',
    package: '@dxos/log',
    param_index: 1,
    include_args: true,
    include_call_site: false,
    include_scope: false,
  },
  {
    name: 'invariant',
    package: '@dxos/invariant',
    param_index: 2,
    include_args: true,
    include_call_site: false,
    include_scope: true,
  },
  {
    name: 'Context',
    package: '@dxos/context',
    param_index: 1,
    include_args: false,
    include_call_site: false,
    include_scope: false,
  },
];

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

/** Dev NDJSON log file sink (HMR). `enabled` must be `true` to turn on. */
export type DxosLogPluginLogToFile = {
  enabled: true;
  /** @default 'app.log' */
  filename?: string;
};

/** Rolldown call-site meta injection. `enabled` must be `true` to turn on. */
export type DxosLogPluginTransform = {
  enabled: true;
  /** Same as SWC `to_transform`. Defaults to {@link DEFAULT_LOG_META_TRANSFORM_SPEC} when omitted. */
  spec?: LogMetaTransformSpec[];
  /** Overrides `__dxlog_file`; defaults to the module `id`. */
  filename?: string;
  /**
   * Skip modules whose id matches (default: `node_modules`, `\0` virtual).
   * @default /node_modules|\\0/
   */
  excludeId?: RegExp;
};

export type DxosLogPluginOptions = {
  /** Pass `false` to disable the dev log file sink. @default `{ enabled: true }` */
  logToFile?: DxosLogPluginLogToFile | false;
  /**
   * Pass `false` to disable Rolldown log-meta injection.
   * @default `{ enabled: true, spec: DEFAULT_LOG_META_TRANSFORM_SPEC }`
   */
  transform?: DxosLogPluginTransform | false;
};
