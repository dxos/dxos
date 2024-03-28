//
// Copyright 2024 DXOS.org
//

import { ChainInput, ChainInputType, ChainPromptType, TextV0Type } from '@braneframe/types';
import * as E from '@dxos/echo-schema';

export const str = (...text: (string | undefined | boolean)[]): string =>
  text
    .filter((value) => value !== undefined && value !== false)
    .flat()
    .join('\n');

export type Preset = {
  id: string;
  title: string;
  prompt: () => ChainPromptType;
};

export const presets = [
  {
    id: 'dxos.org/prompt/translate',
    title: 'Translate',
    prompt: () =>
      E.object(ChainPromptType, {
        command: 'say',
        source: E.object(TextV0Type, {
          content: str(
            // prettier-ignore
            'Translate the following into {language}:',
            '',
            '---',
            '',
            '{input}',
          ),
        }),
        inputs: [
          // prettier-ignore
          E.object(ChainInput, {
            name: 'language',
            type: ChainInputType.VALUE,
            value: 'japanese',
          }),
          E.object(ChainInput, { name: 'input', type: ChainInputType.PASS_THROUGH }),
        ],
      }),
  },
  {
    id: 'dxos.org/prompt/chess',
    title: 'Chess',
    prompt: () =>
      E.object(ChainPromptType, {
        command: 'hint',
        source: E.object(TextV0Type, {
          content: str(
            // prettier-ignore
            'You are a machine that is an expert chess player.',
            '',
            'The move history of the current game is: {history}',
            '',
            'Suggest the next move and very briefly explain your strategy in a couple of sentences.',
          ),
        }),
        inputs: [
          // prettier-ignore
          E.object(ChainInput, {
            name: 'history',
            type: ChainInputType.CONTEXT,
            value: 'object.pgn',
          }),
        ],
      }),
  },
  {
    id: 'dxos.org/prompt/mermaid',
    title: 'Mermaid',
    prompt: () =>
      E.object(ChainPromptType, {
        command: 'draw',
        source: E.object(TextV0Type, {
          content: str(
            // prettier-ignore
            'Create a simplified mermaid graph representing the text below.',
            'Do not explain anything.',
            '',
            '---',
            '',
            '{input}',
          ),
        }),
        inputs: [
          // prettier-ignore
          E.object(ChainInput, { name: 'input', type: ChainInputType.PASS_THROUGH }),
        ],
      }),
  },
  {
    id: 'dxos.org/prompt/list',
    title: 'List',
    prompt: () =>
      E.object(ChainPromptType, {
        command: 'list',
        source: E.object(TextV0Type, {
          content: str(
            // prettier-ignore
            'You are a machine that only replies with valid, iterable RFC8259 compliant JSON in your responses.',
            'Your entire response should be a single array of JSON objects.',
            '',
            'Your entire response should be a map where the key is the type and the value is a single array of JSON objects conforming to the following types:',
            '',
            '{schema}',
            '',
            '---',
            '',
            '{question}',
          ),
        }),
        inputs: [
          // prettier-ignore
          E.object(ChainInput, {
            type: ChainInputType.SCHEMA,
            name: 'schema',
            value: 'example.com/schema/project',
          }),
          E.object(ChainInput, { name: 'question', type: ChainInputType.PASS_THROUGH }),
        ],
      }),
  },
  {
    id: 'dxos.org/prompt/base',
    title: 'Base',
    prompt: () =>
      E.object(ChainPromptType, {
        command: 'base',
        source: E.object(TextV0Type, {
          content: str(
            // prettier-ignore
            "Very briefly answer the question based only on the following context and say if you don't know the answer.",
            // 'answer the question using the following context as well as your training data:',
            '',
            '{context}',
            '',
            '---',
            '',
            'question: {question}',
          ),
        }),
        inputs: [
          // prettier-ignore
          E.object(ChainInput, { name: 'context', type: ChainInputType.RETRIEVER }),
          E.object(ChainInput, { name: 'question', type: ChainInputType.PASS_THROUGH }),
        ],
      }),
  },
  {
    id: 'dxos.org/prompt/lookup',
    title: 'Lookup',
    prompt: () =>
      E.object(ChainPromptType, {
        command: 'lookup',
        source: E.object(TextV0Type, {
          content: str(
            // prettier-ignore
            'Lookup and very briefly summarize the following topic in one or two sentences:',
            '',
            '---',
            '',
            '{input}',
          ),
        }),
        inputs: [
          // prettier-ignore
          E.object(ChainInput, { name: 'input', type: ChainInputType.CONTEXT, value: 'text' }),
        ],
      }),
  },
  {
    id: 'dxos.org/prompt/extract',
    title: 'Extract',
    prompt: () =>
      E.object(ChainPromptType, {
        command: 'extract',
        source: E.object(TextV0Type, {
          content: str(
            // prettier-ignore
            'List all people and companies mentioned in the text below.',
            '',
            'You are a machine that only replies with valid, iterable RFC8259 compliant JSON in your responses.',
            'Your entire response should be a map where the key is the type and the value is a single array of JSON objects conforming to the following types:',
            '',
            '{contact}',
            '{company}',
            '',
            '---',
            '',
            '{input}',
          ),
        }),
        inputs: [
          // prettier-ignore
          E.object(ChainInput, {
            type: ChainInputType.SCHEMA,
            name: 'contact',
            value: 'example.com/schema/contact',
          }),
          E.object(ChainInput, {
            type: ChainInputType.SCHEMA,
            name: 'company',
            value: 'example.com/schema/organization',
          }),
          E.object(ChainInput, { name: 'input', type: ChainInputType.CONTEXT, value: 'text' }),
        ],
      }),
  },
  {
    id: 'dxos.org/prompt/discord',
    title: 'Summarize',
    prompt: () =>
      E.object(ChainPromptType, {
        command: 'summarize',
        source: E.object(TextV0Type, {
          content: str(
            // prettier-ignore
            'Summarize what the team is working on and format it as a markdown table without any explanation.',
            '',
            '---',
            '',
            '{context}',
          ),
        }),
        inputs: [
          // prettier-ignore
          E.object(ChainInput, {
            name: 'context',
            type: ChainInputType.RESOLVER,
            value: 'discord.messages.recent',
          }),
        ],
      }),
  },
];
