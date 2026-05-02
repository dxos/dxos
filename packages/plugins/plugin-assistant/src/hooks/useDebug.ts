//
// Copyright 2025 DXOS.org
//

import { useCallback } from 'react';

import { trim } from '@dxos/util';

import { type AiChatProcessor } from '../processor';

export const useDebug = ({ processor }: { processor: AiChatProcessor }) => {
  return useCallback(async () => {
    const objects = processor.context.getObjects();
    const blueprints = processor.context.getBlueprints();
    const system = await processor.getSystemPrompt();
    const tools = await processor.getTools();
    console.group('Chat', { objects, blueprints });
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
    console.groupEnd();
  }, [processor]);
};
