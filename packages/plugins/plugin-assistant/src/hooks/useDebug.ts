//
// Copyright 2025 DXOS.org
//

import { useCallback } from 'react';

import { trim } from '@dxos/util';

import { type ChatModel } from '../chat-model/index.ts';

/**
 * Returns an async callback that logs the chat's current context, system prompt,
 * and resolved tools to the browser console under a collapsible group.
 * Used by the chat's debug-toggle event handler.
 */
export const useDebug = ({ chatModel }: { chatModel?: ChatModel }) => {
  return useCallback(async () => {
    if (!chatModel) {
      return;
    }

    const objects = chatModel.context.getObjects();
    const skills = chatModel.context.getSkills();
    const system = await chatModel.getSystemPrompt();
    const tools = (await chatModel.getTools()) ?? {};
    console.group('Chat', { objects, skills });
    try {
      console.log(trim`
        System Prompt:
        ${system}
      `);
      console.log(trim`
        Tools:
        ${Object.values(tools)
          .map((tool) => JSON.stringify(tool, null, 2))
          .join('\n')}
      `);
    } finally {
      console.groupEnd();
    }
  }, [chatModel]);
};
