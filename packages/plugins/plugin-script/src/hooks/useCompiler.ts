//
// Copyright 2025 DXOS.org
//

import { useCapabilities, usePluginManager } from '@dxos/app-framework/react';
import { useAsyncEffect } from '@dxos/react-ui';

import { ScriptCapabilities } from '../types';
import type { Compiler } from '../compiler';
import { ScriptEvents } from '../events';

/**
 * Asynchronously sets up the compiler and returns it.
 * @returns The compiler instance or undefined if it is not ready.
 */
export const useCompiler = (): Compiler | undefined => {
  const manager = usePluginManager();
  useAsyncEffect(async () => {
    await manager.activate(ScriptEvents.SetupCompiler);
  }, [manager]);
  const [compiler] = useCapabilities(ScriptCapabilities.Compiler);
  return compiler;
};
