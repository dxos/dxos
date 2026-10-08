//
// Copyright 2026 DXOS.org
//

import { SessionConfig } from '@dxos/ai';

import type * as AssistantCapabilities from '../types/AssistantCapabilities.ts';

/** One row of the chat's agent picker. */
export type AgentOption = {
  value: string;
  label: string;
  icon: string;
  disabled: boolean;
  /** Why the row cannot be picked, shown under its name. */
  description?: string;
};

export type AgentOptionsProps = {
  agents: readonly Pick<AssistantCapabilities.Agent, 'id' | 'label' | 'icon'>[];
  /** Availability of each agent, by index into `agents`. */
  availability: readonly AssistantCapabilities.AgentAvailability[];
  /** The agent the chat names (`chat.session.harness`). */
  current: string;
};

/** Reason shown for an agent a chat names that no plugin registers on this device. */
export const NOT_INSTALLED = 'not installed here';

/**
 * The rows of the agent picker: Composer's own loop first, as the default, then the rest in
 * registration order, with an unavailable agent disabled and its reason as the description. An
 * agent the chat already names but this device does not register is kept, so the picker still
 * shows what the chat runs on.
 */
export const agentOptions = ({ agents, availability, current }: AgentOptionsProps): AgentOption[] => {
  const options = agents.map((agent, index): AgentOption => {
    const status = availability[index];
    return status && !status.available
      ? { value: agent.id, label: agent.label, icon: agent.icon, disabled: true, description: status.reason }
      : { value: agent.id, label: agent.label, icon: agent.icon, disabled: false };
  });

  const sorted = [
    ...options.filter(({ value }) => value === SessionConfig.COMPOSER_HARNESS),
    ...options.filter(({ value }) => value !== SessionConfig.COMPOSER_HARNESS),
  ];

  if (!sorted.some(({ value }) => value === current)) {
    sorted.push({
      value: current,
      label: current,
      icon: 'ph--robot--regular',
      disabled: true,
      description: NOT_INSTALLED,
    });
  }

  return sorted;
};
