//
// Copyright 2025 DXOS.org
//

export type Message = {
  id: string;
  role: 'user' | 'assistant' | 'error';
  content: string;
  timestamp: Date;
};

/**
 * Create a user message.
 */
export const createUserMessage = (content: string): Message => ({
  id: `user-${Date.now()}`,
  role: 'user',
  content,
  timestamp: new Date(),
});

/**
 * Create an empty assistant message placeholder.
 */
export const createAssistantMessage = (content = ''): Message => ({
  id: `assistant-${Date.now()}`,
  role: 'assistant',
  content,
  timestamp: new Date(),
});

/**
 * Create an error message.
 */
export const createErrorMessage = (error: unknown): Message => ({
  id: `error-${Date.now()}`,
  role: 'error',
  content: `Error: ${String(error)}`,
  timestamp: new Date(),
});
