//
// Copyright 2026 DXOS.org
//

/** The `CreateAgent` / `UpdateAgent` request body. Snake-cased to match the wire format. */
export type AgentConfig = {
  name: string;
  model: string | { id: string; effort?: string };
  description?: string;
  system?: string;
  tools?: { type: string }[];
  skills?: { type: 'anthropic'; skill_id: string }[];
  mcp_servers?: { type: 'url'; name: string; url: string }[];
};

export type AgentResponse = {
  id: string;
  version?: number;
};

export type SessionResponse = {
  id: string;
  status?: string;
  stop_reason?: { type: string } | null;
  title?: string;
};

/** A content block on a message event; only text blocks carry readable content. */
export type ContentBlock = {
  type: string;
  text?: string;
};

export type SessionEvent = {
  id?: string;
  type: string;
  content?: ContentBlock[];
  processed_at?: string | null;
};

export type EventPage = {
  data?: SessionEvent[];
  next_page?: string | null;
};

/** One turn of a session transcript, flattened for the assistant. */
export type TranscriptMessage = {
  role: 'user' | 'agent';
  text: string;
};
