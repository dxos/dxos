//
// Copyright 2026 DXOS.org
//

import type { Program } from '@oxc-project/types';
import type { RolldownMagicString, RolldownPlugin } from 'rolldown';

import type { LogMetaTransformOptions } from './rolldown-log-meta-types';
import { computeLogMetaEdits } from './rolldown-log-meta-transform';

const PLUGIN_NAME = 'dxos:rolldown-log-meta';
const DEFAULT_EXCLUDE = /node_modules|\\0/;

const ECMA_MODULE_TYPES = new Set(['js', 'jsx', 'ts', 'tsx']);

type TransformMeta = {
  moduleType: string;
  ast?: Program;
  magicString?: RolldownMagicString;
};

/**
 * Rolldown / Vite (Rolldown) transform plugin: injects the same call-site metadata object as
 * `@dxos/swc-log-plugin`, using {@link https://rolldown.rs/reference/Interface.Plugin#transform | Rolldown’s `transform` hook}
 * with {@link https://github.com/rolldown/rolldown/blob/main/packages/rolldown/src/plugin/bindingify-build-hooks.ts | `meta.ast`} (Oxc AST, parsed by Rolldown when accessed), {@link https://rolldown.rs/apis/javascript-api#utilities | `Visitor` from `rolldown/utils`} to walk that AST, and `meta.magicString` for edits.
 *
 * Enable `experimental.nativeMagicString` in Rolldown/Vite for best source map behavior when using MagicString.
 */
export function rolldownLogMetaPlugin(options: LogMetaTransformOptions): RolldownPlugin {
  const { to_transform, filename: filenameOverride, excludeId = DEFAULT_EXCLUDE } = options;

  return {
    name: PLUGIN_NAME,
    transform: {
      order: 'pre' as const,
      handler(code: string, id: string, meta: TransformMeta) {
        if (excludeId.test(id)) {
          return null;
        }
        if (!ECMA_MODULE_TYPES.has(meta.moduleType)) {
          return null;
        }

        const program = meta.ast;
        if (!program) {
          return null;
        }

        const displayPath = filenameOverride ?? id;
        const edits = computeLogMetaEdits(program, code, to_transform, displayPath);
        if (edits.length === 0) {
          return null;
        }

        const ms = meta.magicString;
        if (!ms) {
          return null;
        }

        const sorted = [...edits].sort((a, b) => b.pos - a.pos);
        for (const { pos, text } of sorted) {
          ms.appendLeft(pos, text);
        }

        return { code: ms };
      },
    },
  } satisfies RolldownPlugin;
}
