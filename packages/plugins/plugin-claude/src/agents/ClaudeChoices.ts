//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type { Chat } from '@dxos/assistant';
import type * as AssistantCapabilities from '@dxos/plugin-assistant/AssistantCapabilities';

import * as Settings from '../types/Settings.ts';

/** The choices a chat made for its session. */
type Session = Chat.Chat['session'];

/** Aliases the Claude Code CLI resolves to its current models; a chat that picks none runs the CLI's default. */
export const MODELS: readonly AssistantCapabilities.AgentChoice[] = [
  { id: 'opus', label: 'Opus' },
  { id: 'sonnet', label: 'Sonnet' },
  { id: 'haiku', label: 'Haiku' },
];

/** Claude Code's effort levels; a model that lacks one runs at the nearest it has. */
export const EFFORTS: readonly AssistantCapabilities.AgentChoice[] = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
  { id: 'xhigh', label: 'Extra high' },
  { id: 'max', label: 'Max' },
];

const MODE_LABELS: Record<Settings.AgentPermissionMode, string> = {
  default: 'Ask before acting',
  acceptEdits: 'Accept edits',
  auto: 'Auto (classifier decides)',
  bypassPermissions: 'Bypass permissions',
};

/** Claude Code's permission modes; a chat that picks none runs the plugin setting's mode. */
export const MODES: readonly AssistantCapabilities.AgentChoice[] = Settings.AgentPermissionMode.literals.map((id) => ({
  id,
  label: MODE_LABELS[id],
}));

/** Everything a Claude Code chat can choose for itself. */
export const CHOICES: AssistantCapabilities.AgentChoices = {
  agentModel: MODELS,
  agentEffort: EFFORTS,
  agentMode: MODES,
};

/** The Agent SDK options (ACP `_meta.claudeCode.options`) a chat's choices of model and effort become. */
export const sdkOptions = (session: Session | undefined): { model?: string; effort?: string } => ({
  ...(session?.agentModel && { model: session.agentModel }),
  ...(session?.agentEffort && { effort: session.agentEffort }),
});

/** The permission mode a chat runs in: its own choice, else the plugin setting's, else the default. */
export const permissionMode = (session: Session | undefined, settings: Settings.Settings | undefined): string =>
  session?.agentMode ?? settings?.agentPermissionMode ?? Settings.DEFAULT_AGENT_PERMISSION_MODE;
