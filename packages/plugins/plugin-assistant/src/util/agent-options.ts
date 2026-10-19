//
// Copyright 2026 DXOS.org
//

import { SessionConfig } from '@dxos/ai';

import type * as AssistantCapabilities from '../types/AssistantCapabilities.ts';

/** One place an agent runs, and the registration (harness) that runs it there. */
export type AgentPlacement = {
  location: AssistantCapabilities.AgentLocation;
  harness: string;
  available: boolean;
  /** Why the placement cannot be picked. */
  reason?: string;
};

/** One row of the chat's agent picker: an agent, with every place it runs. */
export type AgentOption = {
  /** The agent's own id; a variant registration folds into the agent it names. */
  value: string;
  label: string;
  icon: string;
  /** No placement can be picked. */
  disabled: boolean;
  /** Why the row cannot be picked, shown after its name. */
  description?: string;
  placements: AgentPlacement[];
  /** The agent chooses its own model. */
  ownModel: boolean;
};

export type AgentOptionsProps = {
  agents: readonly Pick<
    AssistantCapabilities.Agent,
    'id' | 'label' | 'icon' | 'locations' | 'variantOf' | 'ownModel'
  >[];
  /** Availability of each agent, by index into `agents`. */
  availability: readonly AssistantCapabilities.AgentAvailability[];
  /** The agent the chat names (`chat.session.harness`). */
  current: string;
};

/** Reason shown for an agent a chat names that no plugin registers on this device. */
export const NOT_INSTALLED = 'not installed here';

const DEFAULT_LOCATIONS: readonly AssistantCapabilities.AgentLocation[] = ['local'];

/**
 * The rows of the agent picker: Composer's own loop first, as the default, then the rest in registration
 * order. A registration that is a variant of another (the same agent run elsewhere) folds into that
 * agent's row as another placement. An agent the chat already names but this device does not register is
 * kept, so the picker still shows what the chat runs on.
 */
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
      // The agent's own registration names the row, whichever registered first.
      if (agent.variantOf === undefined) {
        Object.assign(existing, { label: agent.label, icon: agent.icon });
      }
    } else {
      options.set(key, {
        value: key,
        label: agent.label,
        icon: agent.icon,
        disabled: false,
        placements,
        ownModel: agent.ownModel ?? false,
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
    sorted.push({
      value: current,
      label: current,
      icon: 'ph--robot--regular',
      disabled: true,
      description: NOT_INSTALLED,
      placements: [{ location: 'local', harness: current, available: false, reason: NOT_INSTALLED }],
      ownModel: false,
    });
  }

  return sorted;
};

/** The row whose placements include `harness`. */
export const optionForHarness = (options: readonly AgentOption[], harness: string): AgentOption | undefined =>
  options.find(({ placements }) => placements.some((placement) => placement.harness === harness));
