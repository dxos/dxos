AiSession (packages/core/assistant/src/conversation/session.ts)
  │
  │  emits ephemeral Trace events containing
  │  PartialBlock { messageId, role, block: ContentBlock.Any }
  │  via AgentService.Session.subscribeEphemeral(): Stream<Trace.Message>
  ▼
AiChatProcessor (packages/plugins/plugin-assistant/src/processor/processor.ts)
  │
  │  Stream.runForEach → if Trace.isOfType(PartialBlock) →
  │    #handleEphemeralMessage(event.data)
  │      → upserts Message.Message into #streaming atom
  │      → finalizes into #messages atom on complete block
  ▼
Chat.tsx (packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx)
  │
  │  reads processor.messages + processor.streaming atoms,
  │  passes flat Message[] down to ChatThread
  ▼
ChatThread.tsx (packages/plugins/plugin-assistant/src/components/ChatThread/ChatThread.tsx)
  │
  │  MessageSyncer (sync.ts) compares current messages
  │  to last rendered set:
  │    - new finalized chunk → controller.append(delta)
  │    - changed earlier message → controller.setContent(full)
  │  blockToMarkdown serializes ContentBlocks → markdown,
  │  embedding tool calls as XML widget tags
  │  (e.g. <tool-call name="...">...</tool-call>)
  ▼
MarkdownStreamController.append / setContent
  ▼
MarkdownStream (packages/ui/react-ui-components/src/components/MarkdownStream)
  │
  │  CodeMirror editor with:
  │    - extendedMarkdown (parseMixed → xmlLanguage on HTMLBlock/Paragraph)
  │    - xmlTags (registry → React/native widget portals)
  │    - wire extension (buffers appended text, drips at typewriter rate,
  │      treats XML atomic ranges as indivisible units)
  ▼
Rendered DOM (markdown + portaled widgets for tool calls / reasoning / etc.)
