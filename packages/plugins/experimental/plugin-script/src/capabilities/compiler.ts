//
// Copyright 2025 DXOS.org
//

// @ts-ignore
import wasmUrl from 'esbuild-wasm/esbuild.wasm?url';

import { contributes } from '@dxos/app-framework';

import { ScriptCapabilities } from './capabilities';
import { initializeBundler } from '../bundler';
import { Compiler } from '../compiler';

export default async () => {
  const compiler = new Compiler();

  await compiler.initialize();
  // TODO(wittjosiah): Proper function handler types.
  // TODO(wittjosiah): Remove.
  compiler.setFile(
    './src/runtime.ts',
    `
        export const Filter: any = {};
        export type FunctionHandler = ({ event, context }: { event: any; context: any }) => Promise<Response>;
        export const functionHandler = (handler: FunctionHandler) => handler;
      `,
  );
  await initializeBundler({ wasmUrl });

  return contributes(ScriptCapabilities.Compiler, compiler);
};
