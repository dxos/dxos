//
// Copyright 2025 DXOS.org
//

import * as AppHooks from '@dxos/app-framework/Hooks';
import * as PluginManagerProvider from '@dxos/app-framework/PluginManagerProvider';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as Hooks from '@dxos/react-ui/Hooks';

import { ScriptCapabilities, ScriptEvents } from '#types';

import type { Compiler } from '../compiler/index.ts';

/**
 * Asynchronously sets up the compiler and returns it.
 * @returns The compiler instance or undefined if it is not ready.
 */
export const useCompiler = (): Compiler | undefined => {
  const manager = PluginManagerProvider.usePluginManager();
  Hooks.useAsyncEffect(async () => {
    await manager.activate(ScriptEvents.SetupCompiler).pipe(EffectEx.runAndForwardErrors);
  }, [manager]);
  const [compiler] = AppHooks.useCapabilities(ScriptCapabilities.Compiler);
  return compiler;
};
