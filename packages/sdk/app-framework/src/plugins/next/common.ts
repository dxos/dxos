//
// Copyright 2025 DXOS.org
//

import type { FC, PropsWithChildren } from 'react';

import { defineEvent, defineInterface } from './host';
import { type IntentContext, type AnyIntentResolver } from '../plugin-intent';

//
// Common Contributions
//

export namespace Contributions {
  export type ReactContext = { id: string; dependsOn?: string[]; context: FC<PropsWithChildren> };
  export const ReactContext = defineInterface<ReactContext>('dxos.org/app-framework/contributions/react-context');

  export type ReactRoot = { id: string; root: FC<PropsWithChildren> };
  export const ReactRoot = defineInterface<ReactRoot>('dxos.org/app-framework/contributions/react-root');

  export type IntentResolver = { resolvers: AnyIntentResolver | AnyIntentResolver[] };
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
   * Fired when plugin state is ready.
   */
  export const createStateEvent = (specifier: string) => defineEvent('dxos.org/app-framework/events/state', specifier);
}
