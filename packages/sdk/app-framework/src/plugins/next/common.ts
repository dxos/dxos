//
// Copyright 2025 DXOS.org
//

import type { FC, PropsWithChildren } from 'react';

import { type PluginManager } from './manager';
import { defineEvent, defineInterface } from './plugin';
import { type IntentContext, type AnyIntentResolver } from '../plugin-intent';
import { type SurfaceDefinition } from '../plugin-surface';

//
// Common Capabilities
//

export namespace Capabilities {
  export const PluginManager = defineInterface<PluginManager>('dxos.org/app-framework/capabilities/plugin-manager');

  export type ReactContext = { id: string; dependsOn?: string[]; context: FC<PropsWithChildren> };
  export const ReactContext = defineInterface<ReactContext>('dxos.org/app-framework/contributions/react-context');

  export type ReactRoot = { id: string; root: FC<PropsWithChildren> };
  export const ReactRoot = defineInterface<ReactRoot>('dxos.org/app-framework/contributions/react-root');

  export type ReactSurface = SurfaceDefinition | SurfaceDefinition[];
  export const ReactSurface = defineInterface<ReactSurface>('dxos.org/app-framework/common/react-surface');

  export type IntentResolver = AnyIntentResolver | AnyIntentResolver[];
  export const IntentResolver = defineInterface<IntentResolver>('dxos.org/app-framework/contributions/intent-resolver');

  export type IntentDispatcher = Omit<IntentContext, 'registerResolver'>;
  export const IntentDispatcher = defineInterface<IntentDispatcher>(
    'dxos.org/app-framework/contributions/intent-dispatcher',
  );
}

//
// Common Activation Events
//

export namespace Events {
  /**
   * Fired when the app is started.
   */
  export const Startup = defineEvent('dxos.org/app-framework/events/startup');

  /**
   * Fired before the intent dispatcher is activated.
   */
  export const SetupIntents = defineEvent('dxos.org/app-framework/events/setup-intents');

  /**
   * Fired when plugin state is ready.
   */
  export const createStateEvent = (specifier: string) => defineEvent('dxos.org/app-framework/events/state', specifier);
}
