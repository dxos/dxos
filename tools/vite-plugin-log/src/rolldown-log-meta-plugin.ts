//
// Copyright 2026 DXOS.org
//

import type { RolldownPlugin } from 'rolldown';

import type { LogMetaTransformOptions } from './definitions.ts';
import { ROLLDOWN_LOG_META_PLUGIN_NAME, rolldownLogMetaTransform, type RolldownLogMetaHookContext } from './plugin.ts';

/**
 * Rolldown / Vite (Rolldown) transform plugin: injects per-call-site metadata using
 * {@link https://rolldown.rs/reference/Interface.Plugin#transform | Rolldown’s `transform` hook}
 * with {@link https://github.com/rolldown/rolldown/blob/main/packages/rolldown/src/plugin/bindingify-build-hooks.ts | `meta.ast`} (Oxc AST, parsed by Rolldown when accessed), {@link https://rolldown.rs/apis/javascript-api#utilities | `Visitor` from `rolldown/utils`} to walk that AST, and `meta.magicString` for edits.
 *
 * Enable `experimental.nativeMagicString` in Rolldown/Vite for best source map behavior when using MagicString.
 *
 * Together with the dev log sink, use `DxosLogPlugin` from `@dxos/vite-plugin-log`.
 */
export function rolldownLogMetaPlugin(options: LogMetaTransformOptions): RolldownPlugin {
  return {
    name: ROLLDOWN_LOG_META_PLUGIN_NAME,
    transform: {
      order: 'pre' as const,
      filter: {
        // Only process JS/TS source files; exclude JSON, CSS, etc.
        moduleType: { include: ['js', 'jsx', 'ts', 'tsx'] as string[] },
      },
      handler(code: string, id: string, meta: Pick<RolldownLogMetaHookContext, 'moduleType' | 'ast' | 'magicString'>) {
        // Do NOT pass meta.magicString: rolldown's native MagicString has an off-by-N bug
        // in appendLeft when used directly from the transform hook context. Using a fresh
        // RolldownMagicString(code) produces correct insertions.
        return rolldownLogMetaTransform(options, {
          code,
          id,
          moduleType: meta.moduleType,
          ast: meta.ast,
        });
      },
    },
  } satisfies RolldownPlugin;
}
