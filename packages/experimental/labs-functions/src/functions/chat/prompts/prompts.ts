//
// Copyright 2023 DXOS.org
//

import { type ChatMessage } from 'langchain/schema';

import { type Schema } from '@dxos/echo-schema';

import chess from './extensions/chess';
import def from './extensions/default';
import list from './extensions/list';

const prompts: PromptGenerator[] = [chess, list, def];

export type PromptContext = { message: string; context?: any; schema?: Schema };

export type PromptGenerator = (context: PromptContext) => ChatMessage[] | null;

// TODO(burdon): Investigate LangChain prompt templates.
export const createPrompt = (context: PromptContext): ChatMessage[] => {
  for (const prompt of prompts) {
    const messages = prompt(context);
    if (messages) {
      return messages;
    }
  }

  throw new Error('Error generating prompt.');
};
