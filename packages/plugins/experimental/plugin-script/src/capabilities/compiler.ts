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
  const compiler = new Compiler();

  (globalThis as any).composer ??= {};
  (globalThis as any).composer.compiler = compiler;

  await compiler.initialize();
  await initializeBundler({ wasmUrl });

  return contributes(ScriptCapabilities.Compiler, compiler);
};

const _globals = `
  import { defineFunction } from 'npm:@dxos/functions@main';
  type DefineFunction = typeof defineFunction;

  declare global {
    var defineFunction: DefineFunction;
  }
`;
