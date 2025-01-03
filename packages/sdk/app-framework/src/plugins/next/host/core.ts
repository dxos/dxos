//
// Copyright 2025 DXOS.org
//

import { type AnyActivationEvent, defineEvent, defineInterface } from './plugin';

export const StartupEvent = defineEvent('dxos.org/app-framework/events/startup', 'once');

export const ActivationEvent = defineInterface<{ event: AnyActivationEvent }>(
  'dxos.org/app-framework/contributions/activation-event',
);

/**
 * Fired when plugin activation events are registered.
 */
export const createActivationRegisteredEvent = (specifier: string) =>
  defineEvent('dxos.org/app-framework/events/activation-registered', 'once', specifier);
