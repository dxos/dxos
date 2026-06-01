//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

export const meta = Plugin.makeMeta({
  key: DXN.make('org.dxos.plugin.thread'),
  name: 'Threads',
  author: 'DXOS',
  description: trim`
    ThreadPlugin renders comment threads anchored to ECHO objects and provides a
    persistent chat channel attached to every workspace. Threads can be created
    inline on any Markdown document, letting collaborators leave contextual
    comments and hold focused discussions without leaving the document surface.

    Each thread carries an optional AI agent configuration that controls how the
    built-in assistant participates in the conversation. Threads can be set to
    off, mention-only (the agent responds only when @-mentioned by name), or
    auto mode (the agent replies to every new user message). The agent identity —
    display name, DID, and avatar — is resolved at runtime from a pluggable
    Effect capability so host applications can substitute their own assistant
    persona.

    When the agent is enabled, it executes one LLM turn per trigger via the
    AgentRunner capability. The runner has access to edit tools that can splice
    a replacement range into the anchored document span or replace the entire
    document content, so the assistant can propose inline edits in addition to
    posting chat replies. A self-loop guard prevents the agent from responding
    to its own messages, and resolved threads are excluded from triggering.

    The toggle UI appears as a per-thread icon button in the CommentsPanel
    header. Clicking it opens a popover with three radio options (off / mention /
    auto) and a read-only label showing the active agent name. All state changes
    go through the SetAgentConfig operation rather than direct schema writes,
    keeping mutation logic in one place and making the feature testable with
    stub runners in storybook.
  `,
  icon: 'ph--video-conference--regular',
  iconHue: 'rose',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-thread',
  spec: 'PLUGIN.mdl',
});

export const THREAD_ITEM = `${meta.id}.item`;
