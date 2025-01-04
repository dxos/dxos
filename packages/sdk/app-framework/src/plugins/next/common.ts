//
// Copyright 2025 DXOS.org
//

import type { FC, PropsWithChildren } from 'react';

import { defineEvent, defineInterface } from './host';
import { type IntentContext, type AnyIntentResolver } from '../plugin-intent';

//
// Common Contributions
//

export const ReactContext = defineInterface<{ context: FC<PropsWithChildren> }>(
  'dxos.org/app-framework/contributions/react-context',
);

export const ReactRoot = defineInterface<{ root: FC<PropsWithChildren> }>(
  'dxos.org/app-framework/contributions/react-root',
);

export const IntentResolver = defineInterface<{ resolvers: AnyIntentResolver | AnyIntentResolver[] }>(
  'dxos.org/app-framework/contributions/intent-resolver',
);

export const IntentDispatcher = defineInterface<Omit<IntentContext, 'registerResolver'>>(
  'dxos.org/app-framework/contributions/intent-dispatcher',
);

//
// Common Activation Events
//

/**
 * Fired when the app is started.
 */
export const StartupEvent = defineEvent('dxos.org/app-framework/events/startup');

/**
 * Fired when plugin state is ready.
 */
export const createStateEvent = (specifier: string) => defineEvent('dxos.org/app-framework/events/state', specifier);
