//
// Copyright 2025 DXOS.org
//

import * as Hooks from '@dxos/app-framework/Hooks';
import * as PluginManagerProvider from '@dxos/app-framework/PluginManagerProvider';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as UiHooks from '@dxos/react-ui/Hooks';

import { ScriptCapabilities, ScriptEvents } from '#types';

import type { Compiler } from '../compiler/index.ts';

/**
 * Asynchronously sets up the compiler and returns it.
 * @returns The compiler instance or undefined if it is not ready.
 */
export const useCompiler = (): Compiler | undefined => {
  const manager = PluginManagerProvider.usePluginManager();
  UiHooks.useAsyncEffect(async () => {
    await manager.activate(ScriptEvents.SetupCompiler).pipe(EffectEx.runAndForwardErrors);
  }, [manager]);
  const [compiler] = Hooks.useCapabilities(ScriptCapabilities.Compiler);
  return compiler;
};
