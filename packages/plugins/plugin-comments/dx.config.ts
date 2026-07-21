//
// Copyright 2025 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.comments',
    name: 'Comments',
    author: 'DXOS',
    description: trim`
      CommentsPlugin renders comment threads anchored to ECHO objects (primarily Markdown
      documents). Threads can be created inline on any commentable object, letting collaborators
      leave contextual comments and hold focused discussions without leaving the document surface.

      The same companion doubles as a document review surface: a document's active suggestion
      branches (one per author) are diffed against the current content and rendered as change-block
      tiles alongside comment threads, so comments and Google-Docs-style suggestions share one
      review UI. Each suggestion tile carries Accept/Reject controls that route through durable,
      per-change cherry-pick / revert operations, and every suggestion is tinted with its author's
      palette colour (matching the author's avatar/tag and the editor's inline markers). When there
      are neither comments nor suggestions, a single empty-state prompt explains both affordances.

      Each thread carries an optional AI agent configuration that controls how the built-in
      assistant participates in the conversation. Threads can be set to off, mention-only (the
      agent responds only when @-mentioned by name), or auto mode (the agent replies to every new
      user message). The agent identity — display name, DID, and avatar — is resolved at runtime
      from a pluggable Effect capability so host applications can substitute their own assistant
      persona.

      When the agent is enabled, it executes one LLM turn per trigger via the AgentRunner
      capability. The runner has access to edit tools that can splice a replacement range into the
      anchored document span or replace the entire document content, so the assistant can propose
      inline edits in addition to posting chat replies. A self-loop guard prevents the agent from
      responding to its own messages, and resolved threads are excluded from triggering.

      The plugin is fully self-contained and depends on no other Composer plugin: shared
      message/thread UI comes from @dxos/react-ui-thread and the Thread/Message/AnchoredTo schema
      comes from @dxos/types.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-comments',
    icon: { key: 'ph--chat-text--regular', hue: 'indigo' },
    spec: 'PLUGIN.mdl',
  },
});
