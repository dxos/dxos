//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

//
// Agent sessions: conversations with an agent on behalf of a caller that is not a channel, such as an MCP client
// asking it a question (EDGE compute-service's `askAgent`). Each session is the agent's own chat, keyed by
// {@link sessionKey}. This module imports nothing, so a worker that only routes to the operation stays light.
//

/** `@meta.keys` source of a session's chat; the id is `<kind>:<key>`. */
export const SESSION_SOURCE = 'org.dxos.agent/session';

/** Key of `AgentOperation.EnsureSessionChat`, for callers that invoke it by key without loading its schema. */
export const ENSURE_SESSION_CHAT_KEY = 'org.dxos.operation.agent.ensureSessionChat';

/** The foreign key of a session's chat. */
export const sessionKey = (kind: string, key: string) => ({ source: SESSION_SOURCE, id: `${kind}:${key}` });
