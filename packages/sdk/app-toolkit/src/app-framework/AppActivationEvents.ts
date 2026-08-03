//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as ActivationEvent$ from '@dxos/app-framework/ActivationEvent';
import * as ActivationEvents$ from '@dxos/app-framework/ActivationEvents';

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

/**
 * The assistant plugin's start event, derived from its well-known key. Skills (and other
 * assistant-consumed contributions from arbitrary plugins) ride the CONSUMER's start event, and
 * naming it by key convention here avoids a package dependency on the assistant plugin — which
 * would be cyclic for plugins the assistant itself integrates with (markdown, routine).
 *
 * Must equal `AssistantEvents.Start` in plugin-assistant, which derives the same event from its
 * own meta.
 */
export const AssistantStart = ActivationEvents$.PluginStart('org.dxos.plugin.assistant');
