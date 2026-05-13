# MCP Server Invocation from Chat

## Summary

Extend `@dxos/assistant` so that MCP servers can be invoked from the chat. MCP servers are configured as ECHO objects at the space level, managed through a new tab in ChatOptions, and their tools are made available to the assistant transparently alongside built-in tools.

## Scope

### In scope

- New `McpServer` ECHO type persisted in the space
- ChatOptions UI panel for CRUD of MCP server configurations
- Space-level server list shared across all chats
- Auth support (optional API key per server)
- Integration with `AiConversation` turn loop
- Natural language tool invocation (agent picks the right MCP tool)

### Out of scope (future)

- `@completion` in prompt editor for explicit tool invocation
- Per-chat server filtering
- Tool grouping/labeling by server origin
- Stdio transport for local MCP servers

## Design

### 1. McpServer ECHO Type

**Package:** `@dxos/assistant-toolkit`
**File:** `src/types/McpServer.ts`

New ECHO schema alongside existing `Chat` and `Agent` types:

```typescript
export const McpServer = Schema.Struct({
  name: Schema.String,
  url: Schema.String,
  protocol: Schema.Union(Schema.Literal('sse'), Schema.Literal('http')),
  apiKey: Schema.optional(Schema.String),
  enabled: Schema.optional(Schema.Boolean),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.assistant.mcpServer',
    version: '0.1.0',
  }),
);
```

- `enabled` defaults to `true` when not set
- Objects live in the space root, queryable via `db.query(Filter.type(McpServer))`

### 2. McpToolkit Auth Extension

**Package:** `@dxos/mcp-client`
**File:** `src/McpToolkit.ts`

Extend `McpToolkitOptions` with optional `apiKey`:

```typescript
interface McpToolkitOptions {
  url: string;
  kind: 'sse' | 'http';
  apiKey?: string;
}
```

When `apiKey` is provided, pass `Authorization: Bearer <apiKey>` header to the transport.

### 3. AiConversation Integration

**Package:** `@dxos/assistant`
**File:** `src/conversation/conversation.ts`

- Add optional `mcpServers` parameter to `AiConversationRequestParams` — an array of space-level `McpServer` objects
- In the turn loop, `connectMcpServers()` merges blueprint-defined servers with space-level enabled servers
- Connection is per-turn (existing pattern), so enabling/disabling a server mid-conversation takes effect on the next turn

### 4. ChatOptions UI

**Package:** `@dxos/plugin-assistant`
**File:** `src/components/ChatPrompt/ChatOptions.tsx`

New "MCP Servers" tab in the settings popover:

- **List:** all `McpServer` objects in the space with name, URL, and enabled toggle
- **Add:** form with name, URL, protocol dropdown (sse/http), optional API key
- **Remove:** delete button per server

Follows existing patterns from `BlueprintsPanel` and `ModelsPanel`.

### 5. Wiring

**Package:** `@dxos/plugin-assistant`
**File:** `src/hooks/useChatProcessor.ts`

- Query `McpServer` objects from space: `db.query(Filter.type(McpServer))`
- Pass enabled servers to `AiConversation.createRequest()` params

## Changes by Package

| Package                   | Change                                                                 |
| ------------------------- | ---------------------------------------------------------------------- |
| `@dxos/assistant-toolkit` | New `McpServer` ECHO type, export from barrel                          |
| `@dxos/mcp-client`        | Add `apiKey` option to `McpToolkit.make()`                             |
| `@dxos/assistant`         | Extend `AiConversation` to accept space-level MCP servers              |
| `@dxos/plugin-assistant`  | New MCP Servers tab in ChatOptions, query/pass servers to conversation |
