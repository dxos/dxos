//
// Copyright 2026 DXOS.org
//

import { transform } from 'oxc-transform-react';
import { type PluginOption } from 'vite';

const SCRIPT_MODULE = /\.[cm]?[jt]s$/;

/** Only a module naming a hook can hold anything the compiler memoises outside JSX. */
const HOOK_NAME = /\buse[A-Z0-9]/;

export type ReactCompilerHooksOptions = {
  /** Module id globs left untouched (e.g. Solid sources). */
  exclude: string[];
};

/**
 * Runs the oxc React Compiler over hooks in plain script modules with JSX, and so Fast Refresh, off,
 * because plugin-react's compiler pass emits `$RefreshReg$` into script modules its refresh wrapper
 * never wraps, which then throw in the client's workers.
 */
export const reactCompilerHooks = ({ exclude }: ReactCompilerHooksOptions): PluginOption => ({
  name: 'dxos-react-compiler-hooks',
  enforce: 'pre',
  applyToEnvironment: (environment) => environment.config.consumer === 'client',
  transform: {
    filter: {
      id: { include: [SCRIPT_MODULE], exclude: [/^\0/, /\/node_modules\//, ...exclude] },
      code: HOOK_NAME,
    },
    handler: async function (code, id) {
      const result = await transform(id.split('?')[0], code, {
        jsx: 'preserve',
        reactCompiler: {},
        sourcemap: this.environment.config.command !== 'build' || !!this.environment.config.build.sourcemap,
      });
      if (result.fatal) {
        this.error(result.errors.map((error) => error.message).join('\n\n') || 'React Compiler transform failed.');
      }

      return { code: result.code, map: result.map };
    },
  },
});
