//
// Copyright 2025 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.sidekick',
    name: 'Sidekick',
    description: trim`
      Sidekick is a personal companion agent for DXOS Composer that acts as a
      persistent, document-aware assistant living inside your workspace. On first
      activation it creates a dedicated Agent instance backed by the Sidekick
      blueprint, sets up a Chat channel for ongoing conversation (with optional
      voice input via plugin-transcription), provisions a daily Journal, and
      generates a frank written profile of the user — goals, character, and
      current priorities — that it refines over time through dialogue.

      For every Person in the space, Sidekick automatically creates and maintains
      a linked markdown Profile document. As new information arrives through
      email, chat, or other sources, the agent updates the relevant profiles and
      suggests relationship category tags such as colleague, investor, friend, or
      customer. A permission matrix lets the user decide, per contact, whether
      the agent may auto-respond on their behalf or should only draft messages
      for manual review.

      The primary surface is the SidekickArticle dashboard, which presents a
      Day Ahead summary derived from today's Journal entry, an aggregated Action
      Items checklist of open tasks from recent entries, a People grid with
      per-contact update badges, the user's own profile excerpt, and the
      per-contact permission toggles. The agent records important decisions,
      key conversations, and action items into dated Journal entries using
      markdown task lists, keeping the dashboard current without manual input.

      Phase 2 extends the plugin with email monitoring and draft generation for
      authorized contacts, background research on tracked persons, and proactive
      comment-thread responses. Future phases add calendar integration for
      day-ahead enrichment, local ML transcription, multi-space person
      deduplication, and agent-to-agent communication.
    `,
    icon: { key: 'ph--brain--regular', hue: 'violet' },
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-sidekick',
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
  },
});
