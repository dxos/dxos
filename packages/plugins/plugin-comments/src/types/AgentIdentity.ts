//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

import { meta } from '#meta';

/**
 * Runtime identity of the comment-thread AI agent.
 *
 * Resolved via a Capability contribution at plugin activation, never stored on
 * Thread.Thread. Renaming the agent globally (e.g. via plugin settings)
 * immediately affects gating and sender metadata on every opted-in thread —
 * past and future.
 *
 * - `name`: display name and @mention token (case-insensitive match).
 * - `identityDid`: optional ECHO DID stamped on assistant messages.
 * - `avatar`: optional icon hint.
 */
export interface AgentIdentity {
  readonly name: string;
  readonly identityDid?: string;
  readonly avatar?: string;
}

export const AgentIdentity = Capability.makeSingleton<AgentIdentity>()(`${meta.profile.key}.capability.agentIdentity`);

/**
 * Built-in default identity used by CommentsPlugin when no host has contributed
 * a stronger `AgentIdentity`. Hosts that want to override (e.g. a workspace-
 * scoped bot record, a settings panel) must contribute their identity earlier
 * in plugin order so `Capability.get` returns it first.
 */
export const DEFAULT_AGENT_IDENTITY: AgentIdentity = { name: 'Kai' };
