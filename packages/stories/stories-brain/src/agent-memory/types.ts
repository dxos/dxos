//
// Copyright 2026 DXOS.org
//

// Public surface mirrored from `@cloudflare/workers-types` (Agent Memory, private beta), so the reference
// model can be swapped for the real `env.MEMORY` binding without touching callers.

export type MemoryType = 'fact' | 'event' | 'instruction' | 'task';

export type ThinkingLevel = 'low' | 'medium' | 'high';

export type ResponseLength = 'short' | 'medium' | 'long';

export type Message = {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: Date;
};

export type IncomingMemory = {
  content: string;
  sessionId?: string | null;
};

export type Memory = {
  id: string;
  type: MemoryType;
  summary: string;
  content: string;
  sessionId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type MemoryListEntry = Omit<Memory, 'content'>;

export type ScoredCandidate = {
  id: string;
  summary: string;
  sessionId: string | null;
  /** Comparable only within a single query. */
  score: number;
};

export type RecallOptions = {
  thinkingLevel?: ThinkingLevel;
  responseLength?: ResponseLength;
  referenceDate?: Date | string;
};

export type RecallResult = {
  count: number;
  answer: string;
  candidates: ScoredCandidate[];
};

export type ListOptions = {
  limit?: number;
  cursor?: string;
  sessionId?: string;
  type?: MemoryType;
};

export type ListResult = {
  memories: MemoryListEntry[];
  cursor?: string;
};

/** The profile RPC target returned by `env.MEMORY.getProfile(name)`. */
export interface Profile {
  get(memoryId: string): Promise<Memory>;
  delete(memoryId: string): Promise<Memory>;
  remember(memory: IncomingMemory): Promise<Memory>;
  ingest(messages: Iterable<Message>, options?: { sessionId?: string | null }): Promise<void>;
  getSummary(options?: { sessionId?: string | null }): Promise<{ summary: string }>;
  recall(query: string, options?: RecallOptions): Promise<RecallResult>;
  list(options?: ListOptions): Promise<ListResult>;
  deleteSession(sessionId: string): Promise<void>;
}

/** The namespace binding (`env.MEMORY`). */
export interface Namespace {
  getProfile(profileName: string): Promise<Profile>;
  deleteProfile(profileName: string): Promise<void>;
}
