//
// Copyright 2025 DXOS.org
//

// @ts-ignore
import wasmUrl from 'esbuild-wasm/esbuild.wasm?url';

import { contributes } from '@dxos/app-framework';
import { initializeBundler } from '@dxos/functions/bundler';

import { ScriptCapabilities } from './capabilities';
import { Compiler } from '../compiler';

export default async () => {
  const compilers = new Map<string, Compiler>();

  (globalThis as any).composer ??= {};
  (globalThis as any).composer.compilers = compilers;

  await initializeBundler({ wasmUrl });

  return contributes(ScriptCapabilities.Compiler, async (workspace) => {
    if (compilers.has(workspace)) {
      return compilers.get(workspace)!;
    }
    const compiler = new Compiler();
    await compiler.initialize();
    compilers.set(workspace, compiler);
    return compiler;
  });
};
