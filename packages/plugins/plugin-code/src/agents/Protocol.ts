//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

/** WebSocket subprotocol the agent helper speaks; a browser cannot set headers on a WebSocket. */
export const SUBPROTOCOL = 'dx-agent';

const TOKEN_PREFIX = 'bearer.';

/** Offered alongside {@link SUBPROTOCOL}: how a WebSocket client presents the helper's token. */
export const tokenProtocol = (token: string): string => `${TOKEN_PREFIX}${token}`;

export const tokenFromProtocols = (protocols: Iterable<string>): string | undefined =>
  [...protocols].find((protocol) => protocol.startsWith(TOKEN_PREFIX))?.slice(TOKEN_PREFIX.length);

/** Lists the agents the helper can launch, with whether each can run on this machine. */
export const AGENTS_PATH = '/agents';

/** Upgrades to a WebSocket that carries one agent's ACP traffic, one JSON-RPC message per frame. */
export const ACP_PATH = '/acp';

/**
 * Git worktrees in the app's data folder, one per delegated chat: `POST` ensures one, `DELETE ?key=`
 * removes one, `GET` lists them.
 */
export const WORKTREES_PATH = '/worktrees';

export const WorktreeRequest = Schema.Struct({
  /** The repository folder the worktree is a checkout of. */
  repository: Schema.String,
  /** Names the worktree's directory; letters, digits, `-` and `_`. */
  key: Schema.String,
  branch: Schema.String,
});
export type WorktreeRequest = Schema.Schema.Type<typeof WorktreeRequest>;

export const Worktree = Schema.Struct({ key: Schema.String, path: Schema.String, branch: Schema.String });
export type Worktree = Schema.Schema.Type<typeof Worktree>;

/** `dirty`: kept, since it holds changes that exist nowhere else. */
export const WorktreeOutcome = Schema.Literals(['removed', 'dirty', 'missing']);
export type WorktreeOutcome = Schema.Schema.Type<typeof WorktreeOutcome>;

/**
 * Composer's MCP tools for an agent, at `/mcp/<server>`. The page cannot listen, so it opens a
 * WebSocket at {@link MCP_HOST_PATH} and the helper relays each request to it as a frame.
 *
 * An agent presents the server's token as a bearer. The token reaches the agent only through its
 * environment ({@link MCP_TOKEN_ENV}), which its MCP config names rather than holds: the config is
 * passed to `claude` on its command line, which any user on the machine can read.
 */
export const MCP_PATH = '/mcp';
export const MCP_HOST_PATH = '/mcp-host';
export const MCP_TOKEN_ENV = 'DX_COMPOSER_MCP_TOKEN';

/** 256 bits as hex: the shape of every MCP token. */
export const MCP_TOKEN = /^[0-9a-f]{64}$/;

const HeaderList = Schema.Array(Schema.Tuple([Schema.String, Schema.String]));

/** Helper to page: one HTTP request an agent made of a registered server. */
export const McpRequestFrame = Schema.TaggedStruct('request', {
  id: Schema.String,
  server: Schema.String,
  method: Schema.String,
  /** Path and query, as the agent requested them. */
  path: Schema.String,
  headers: HeaderList,
  body: Schema.String,
});
export type McpRequestFrame = Schema.Schema.Type<typeof McpRequestFrame>;

/** Page to helper: starts or stops relaying a server id, or answers a request. */
export const McpHostFrame = Schema.Union([
  Schema.TaggedStruct('register', { server: Schema.String, token: Schema.String }),
  Schema.TaggedStruct('unregister', { server: Schema.String }),
  Schema.TaggedStruct('response', {
    id: Schema.String,
    status: Schema.Number,
    headers: HeaderList,
    body: Schema.String,
  }),
]);
export type McpHostFrame = Schema.Schema.Type<typeof McpHostFrame>;

/** An agent the helper knows, as the page sees it. */
export const AgentStatus = Schema.Struct({
  id: Schema.String,
  available: Schema.Boolean,
  /** The command-line tool's version, when it was found. */
  version: Schema.optional(Schema.String),
  /** Why it cannot run, when it cannot. */
  reason: Schema.optional(Schema.String),
});
export type AgentStatus = Schema.Schema.Type<typeof AgentStatus>;

export const acpUrl = ({
  port,
  agent,
  cwd,
  mcpToken,
}: {
  port: number;
  agent: string;
  cwd: string;
  /** Set as {@link MCP_TOKEN_ENV} in the agent's environment. */
  mcpToken?: string;
}): string => {
  const url = new URL(`ws://localhost:${port}${ACP_PATH}`);
  url.searchParams.set('agent', agent);
  url.searchParams.set('cwd', cwd);
  if (mcpToken) {
    url.searchParams.set('mcpToken', mcpToken);
  }
  return url.toString();
};
