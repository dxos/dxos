//
// Copyright 2026 DXOS.org
//

import { ProfileOf } from '@dxos/types';

import { AgentChannels, AgentEmail, Goal, Memory, Mode, Relay } from '#types';

/**
 * Agent, Chat and HasSubject are registered by plugin-assistant, which this plugin depends on;
 * ProfileOf is listed too because profiles are written whether or not plugin-crm is enabled.
 */
export default [
  AgentChannels.AgentChannels,
  AgentEmail.AgentEmail,
  Memory.Memory,
  Goal.Goal,
  Relay.Relay,
  Mode.Mode,
  ProfileOf.ProfileOf,
];
