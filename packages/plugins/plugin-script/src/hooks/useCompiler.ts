import { useCapabilities, useCapability, usePluginManager } from '@dxos/app-framework/react';
import { ScriptCapabilities } from '../capabilities';
import { ScriptEvents } from '../events';
import type { Compiler } from '../compiler';
import { useAsyncEffect } from '@dxos/react-ui';

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
