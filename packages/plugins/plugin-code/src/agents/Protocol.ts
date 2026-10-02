//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

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

/** An agent the helper knows, as the page sees it. */
export type AgentStatus = {
  id: string;
  available: boolean;
  /** The command-line tool's version, when it was found. */
  version?: string;
  /** Why it cannot run, when it cannot. */
  reason?: string;
};

export const acpUrl = ({ port, agent, cwd }: { port: number; agent: string; cwd: string }): string => {
  const url = new URL(`ws://localhost:${port}${ACP_PATH}`);
  url.searchParams.set('agent', agent);
  url.searchParams.set('cwd', cwd);
  return url.toString();
};
