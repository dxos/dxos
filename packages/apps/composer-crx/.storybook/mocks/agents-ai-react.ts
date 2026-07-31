//
// Copyright 2024 DXOS.org
//

// Storybook-only stub for `agents/ai-react`; returns an empty, idle chat so `Chat` renders its
// initial (no-messages) state without a live agent.
export const useAgentChat = () => ({
  error: undefined,
  messages: [] as unknown[],
  sendMessage: async () => {},
  stop: () => {},
  clearError: () => {},
  clearHistory: () => {},
});
