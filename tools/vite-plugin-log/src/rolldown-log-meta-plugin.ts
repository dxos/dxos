//
// Copyright 2026 DXOS.org
//

import type { Program } from '@oxc-project/types';
import type { RolldownMagicString, RolldownPlugin } from 'rolldown';

import type { LogMetaTransformOptions } from './rolldown-log-meta-types';
import { computeLogMetaEdits } from './rolldown-log-meta-transform';

export const ROLLDOWN_LOG_META_PLUGIN_NAME = 'dxos:rolldown-log-meta';

const DEFAULT_EXCLUDE = /node_modules|\\0/;

const ECMA_MODULE_TYPES = new Set(['js', 'jsx', 'ts', 'tsx']);

/** Inputs matching Rolldown’s `transform` hook `meta` plus `code` / `id`. */
export type RolldownLogMetaHookContext = {
  code: string;
  id: string;
  moduleType: string;
  ast?: Program;
  magicString?: RolldownMagicString;
};

/**
 * Applies log-meta edits (same rules as the plugin). Use from tests or custom tooling without
 * constructing a {@link RolldownPlugin}.
 */
export function rolldownLogMetaTransform(
  options: LogMetaTransformOptions,
  ctx: RolldownLogMetaHookContext,
): { code: RolldownMagicString } | null {
  const { to_transform, filename: filenameOverride, excludeId = DEFAULT_EXCLUDE } = options;
  const { code, id, moduleType, ast: program, magicString: ms } = ctx;

  if (excludeId.test(id)) {
    return null;
  }
  if (!ECMA_MODULE_TYPES.has(moduleType)) {
    return null;
  }
  if (!program) {
    return null;
  }

  const displayPath = filenameOverride ?? id;
  const edits = computeLogMetaEdits(program, code, to_transform, displayPath);
  if (edits.length === 0) {
    return null;
  }
  if (!ms) {
    return null;
  }

  const sorted = [...edits].sort((a, b) => b.pos - a.pos);
  for (const { pos, text } of sorted) {
    ms.appendLeft(pos, text);
  }

  return { code: ms };
}

/**
 * Rolldown / Vite (Rolldown) transform plugin: injects the same call-site metadata object as
 * `@dxos/swc-log-plugin`, using {@link https://rolldown.rs/reference/Interface.Plugin#transform | Rolldown’s `transform` hook}
 * with {@link https://github.com/rolldown/rolldown/blob/main/packages/rolldown/src/plugin/bindingify-build-hooks.ts | `meta.ast`} (Oxc AST, parsed by Rolldown when accessed), {@link https://rolldown.rs/apis/javascript-api#utilities | `Visitor` from `rolldown/utils`} to walk that AST, and `meta.magicString` for edits.
 *
 * Enable `experimental.nativeMagicString` in Rolldown/Vite for best source map behavior when using MagicString.
 */
// TODO(dmaretskyi): Combine two plugins into one plugin: DxosLogPlugin.
export function rolldownLogMetaPlugin(options: LogMetaTransformOptions): RolldownPlugin {
  return {
    name: ROLLDOWN_LOG_META_PLUGIN_NAME,
    transform: {
      order: 'pre' as const,
      handler(code: string, id: string, meta: Pick<RolldownLogMetaHookContext, 'moduleType' | 'ast' | 'magicString'>) {
        return rolldownLogMetaTransform(options, {
          code,
          id,
          moduleType: meta.moduleType,
          ast: meta.ast,
          magicString: meta.magicString,
        });
      },
    },
  } satisfies RolldownPlugin;
}
