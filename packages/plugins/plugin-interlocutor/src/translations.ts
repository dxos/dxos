//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { DiscordBinding, Goal, Memory } from '#types';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(DiscordBinding.DiscordBinding)]: {
        'typename.label': 'Discord binding',
        'typename.label_zero': 'Discord bindings',
        'typename.label_one': 'Discord binding',
        'typename.label_other': 'Discord bindings',
        'object-name.placeholder': 'New Discord binding',
      },
      [Type.getTypename(Memory.Memory)]: {
        'typename.label': 'Memory',
        'typename.label_zero': 'Memories',
        'typename.label_one': 'Memory',
        'typename.label_other': 'Memories',
        'object-name.placeholder': 'New memory',
      },
      [Type.getTypename(Goal.Goal)]: {
        'typename.label': 'Goal',
        'typename.label_zero': 'Goals',
        'typename.label_one': 'Goal',
        'typename.label_other': 'Goals',
        'object-name.placeholder': 'New goal',
      },
      [meta.profile.key]: {
        'plugin.name': 'Interlocutor',
        'discord-binding.label': 'Discord',
        'discord-binding.description': 'Connect the agent to a Discord bot.',
        'discord-bot-actions.label': 'Discord bot',
        'discord-bot-start.label': 'Start bot',
        'discord-bot-restart.label': 'Restart bot',
        'discord-bot-stop.label': 'Stop bot',
        'discord-bot-refresh.label': 'Refresh status',
        'discord-bot-unreachable.label': 'Could not reach EDGE',
        'discord-bot-threads.label_zero': 'No threads',
        'discord-bot-threads.label_one': '{{count}} thread',
        'discord-bot-threads.label_other': '{{count}} threads',
        'discord-gateway-checking.label': 'Checking bot status',
        'discord-gateway-idle.label': 'Stopped',
        'discord-gateway-connecting.label': 'Connecting',
        'discord-gateway-ready.label': 'Connected',
        'discord-gateway-closed.label': 'Disconnected',
        'discord-gateway-failed.label': 'Failed',
        'create-agent.label': 'Add interlocutor',
        'new-agent.name': 'New interlocutor',
        'profile-graph-empty.message': 'Nothing recorded yet.',
        'profile-graph-goals.heading': 'Goals',
        'profile-graph-memories.heading': 'Memories',
        'goal-horizon-now.label': 'Now',
        'goal-horizon-quarter.label': 'This quarter',
        'goal-horizon-year.label': 'This year',
        'goal-horizon-long-term.label': 'Long term',
        'goal-status-proposed.label': 'Proposed',
        'goal-status-confirmed.label': 'Confirmed',
        'goal-status-active.label': 'Active',
        'goal-status-achieved.label': 'Achieved',
        'goal-status-dropped.label': 'Dropped',
        'memory-kind-fact.label': 'Fact',
        'memory-kind-preference.label': 'Preference',
        'memory-kind-goal.label': 'Aspiration',
        'memory-kind-commitment.label': 'Commitment',
        'memory-kind-relationship.label': 'Relationship',
        'memory-kind-event.label': 'Event',
        'memory-origin-stated.label': 'Stated',
        'memory-origin-inferred.label': 'Inferred',
      },
    },
  },
] as const satisfies Resource[];
