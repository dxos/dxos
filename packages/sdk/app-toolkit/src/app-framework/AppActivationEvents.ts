//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { ActivationEvent as ActivationEvent$ } from '@dxos/app-framework';

import * as AppCapabilities from './AppCapabilities';

/**
 * Fired when plugin state is ready.
 */
export const createStateEvent = (specifier: string) =>
  ActivationEvent$.make('org.dxos.app-framework.event.state', specifier);
export const LayoutReady = createStateEvent(AppCapabilities.LAYOUT_CAPABILITY_ID);

/**
 * Fired when a specific settings capability is ready.
 */
export const createSettingsEvent = (specifier: string) =>
  ActivationEvent$.make('org.dxos.app-framework.event.settings', specifier);
