//
// Copyright 2026 DXOS.org
//

import { SessionConfig } from '@dxos/ai';

import type * as AssistantCapabilities from '../types/AssistantCapabilities.ts';

export type AgentPlacement = {
  location: AssistantCapabilities.AgentLocation;
  harness: string;
  available: boolean;
  reason?: string;
};

export type AgentOption = {
  value: string;
  label: string;
  icon: string;
  disabled: boolean;
  description?: string;
  placements: AgentPlacement[];
  ownModel: boolean;
  /** What the agent lets a chat choose; only for an `ownModel` agent. */
  choices?: AssistantCapabilities.AgentChoices;
};

export type AgentOptionsProps = {
  agents: readonly Pick<
    AssistantCapabilities.Agent,
    'id' | 'label' | 'icon' | 'locations' | 'variantOf' | 'ownModel' | 'choices'
  >[];
  /** Availability of each agent, by index into `agents`. */
  availability: readonly AssistantCapabilities.AgentAvailability[];
  /** The agent the chat names (`chat.session.harness`). */
  current: string;
};

/** Reason shown for an agent a chat names that no plugin registers on this device. */
export const NOT_INSTALLED = 'not installed here';

const mergeChoices = (
  base: AssistantCapabilities.AgentChoices | undefined,
  preferred: AssistantCapabilities.AgentChoices | undefined,
): AssistantCapabilities.AgentChoices | undefined => (base || preferred ? { ...base, ...preferred } : undefined);

const DEFAULT_LOCATIONS: readonly AssistantCapabilities.AgentLocation[] = ['local'];

export const agentOptions = ({ agents, availability, current }: AgentOptionsProps): AgentOption[] => {
  const options = new Map<string, AgentOption>();
  agents.forEach((agent, index) => {
    const key = agent.variantOf ?? agent.id;
    const status = availability[index];
    const placements = (agent.locations ?? DEFAULT_LOCATIONS).map((location): AgentPlacement =>
      status && !status.available
        ? { location, harness: agent.id, available: false, reason: status.reason }
        : { location, harness: agent.id, available: true },
    );

    const existing = options.get(key);
    if (existing) {
      existing.placements.push(...placements);
      // The registration that is not a variant names the agent, and its choices win where both offer one.
      if (agent.variantOf === undefined) {
        Object.assign(existing, { label: agent.label, icon: agent.icon });
        existing.choices = mergeChoices(existing.choices, agent.choices);
      } else {
        existing.choices = mergeChoices(agent.choices, existing.choices);
      }
    } else {
      options.set(key, {
        value: key,
        label: agent.label,
        icon: agent.icon,
        disabled: false,
        placements,
        ownModel: agent.ownModel ?? false,
        ...(agent.choices && { choices: agent.choices }),
      });
    }
  });

  for (const option of options.values()) {
    const unavailable = option.placements.filter(({ available }) => !available);
    if (unavailable.length === option.placements.length) {
      option.disabled = true;
      option.description = unavailable[0]?.reason;
    }
  }

  const sorted = [
    ...[...options.values()].filter(({ value }) => value === SessionConfig.COMPOSER_HARNESS),
    ...[...options.values()].filter(({ value }) => value !== SessionConfig.COMPOSER_HARNESS),
  ];

  if (!sorted.some(({ placements }) => placements.some(({ harness }) => harness === current))) {
    const missing: AgentPlacement = { location: 'local', harness: current, available: false, reason: NOT_INSTALLED };
    const named = sorted.find(({ value }) => value === current);
    if (named) {
      named.placements.push(missing);
    } else {
      sorted.push({
        value: current,
        label: current,
        icon: 'ph--robot--regular',
        disabled: true,
        description: NOT_INSTALLED,
        placements: [missing],
        ownModel: false,
      });
    }
  }

  return sorted;
};

export const optionForHarness = (options: readonly AgentOption[], harness: string): AgentOption | undefined =>
  options.find(({ placements }) => placements.some((placement) => placement.harness === harness));
