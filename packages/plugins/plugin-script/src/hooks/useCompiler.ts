//
// Copyright 2025 DXOS.org
//

import { useCapabilities, usePluginManager } from '@dxos/app-framework/ui';
import { EffectEx } from '@dxos/effect';
import { useAsyncEffect } from '@dxos/react-ui';

import type { Compiler } from '../compiler';
import * as ScriptCapabilities from '../types/ScriptCapabilities';
import * as ScriptEvents from '../types/ScriptEvents';

/**
 * Asynchronously sets up the compiler and returns it.
 * @returns The compiler instance or undefined if it is not ready.
 */
export const useCompiler = (): Compiler | undefined => {
  const manager = usePluginManager();
  useAsyncEffect(async () => {
    await manager.activate(ScriptEvents.SetupCompiler).pipe(EffectEx.runAndForwardErrors);
  }, [manager]);
  const [compiler] = useCapabilities(ScriptCapabilities.Compiler);
  return compiler;
};
