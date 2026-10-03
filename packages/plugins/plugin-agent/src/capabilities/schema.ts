//
// Copyright 2026 DXOS.org
//

import * as ProfileOf from '@dxos/plugin-crm/ProfileOf';

import { DiscordBinding, Goal, Memory, Mode, Relay } from '#types';

/**
 * Agent, Chat and HasSubject are registered by plugin-assistant, which this plugin depends on;
 * ProfileOf is listed too because profiles are written whether or not plugin-crm is enabled.
 */
export default [DiscordBinding.DiscordBinding, Memory.Memory, Goal.Goal, Relay.Relay, Mode.Mode, ProfileOf.ProfileOf];
