//
// Copyright 2025 DXOS.org
//

import { useCapabilities, usePluginManager } from '@dxos/app-framework/ui';
import { runAndForwardErrors } from '@dxos/effect';
import { useAsyncEffect } from '@dxos/react-ui';

import { ScriptEvents } from '#types';
import { ScriptCapabilities } from '#types';

import type { Compiler } from '../compiler';

/**
 * Asynchronously sets up the compiler and returns it.
 * @returns The compiler instance or undefined if it is not ready.
 */
export const useCompiler = (): Compiler | undefined => {
  const manager = usePluginManager();
  useAsyncEffect(async () => {
    await manager.activate(ScriptEvents.SetupCompiler).pipe(runAndForwardErrors);
  }, [manager]);
  const [compiler] = useCapabilities(ScriptCapabilities.Compiler);
  return compiler;
};
