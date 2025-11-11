//
// Copyright 2025 DXOS.org
//

// @ts-ignore
import wasmUrl from 'esbuild-wasm/esbuild.wasm?url';

import { contributes } from '@dxos/app-framework';
import { initializeBundler } from '@dxos/functions-runtime/bundler';

import { Compiler } from '../compiler';

import { ScriptCapabilities } from './capabilities';

export default async () => {
  const compiler = new Compiler();

  await compiler.initialize();
  // TODO(wittjosiah): Fetch types for https modules.
  compiler.setFile('/src/typings.d.ts', "declare module 'https://*';");
  // TODO(wittjosiah): Proper function handler types.
  // TODO(wittjosiah): Remove.
  compiler.setFile(
    '/src/runtime.ts',
    `
        export const Filter: any = {};
        export type FunctionHandler = ({ event, context }: { event: any; context: any }) => Promise<Response>;
        export const functionHandler = (handler: FunctionHandler) => handler;
      `,
  );
  await initializeBundler({ wasmUrl });

  return contributes(ScriptCapabilities.Compiler, compiler);
};
