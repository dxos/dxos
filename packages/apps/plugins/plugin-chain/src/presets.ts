//
// Copyright 2024 DXOS.org
//

import { ChainInputType, ChainPromptType } from '@braneframe/types';
import { create } from '@dxos/echo-schema';

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

export const chainPresets = [
  {
    id: 'dxos.org/prompt/translate',
    title: 'Translate',
    prompt: () =>
      create(ChainPromptType, {
        command: 'say',
        template: str(
          // prettier-ignore
          'Translate the following into {language}:',
          '',
          '---',
          '',
          '{input}',
        ),
        inputs: [
          {
            type: ChainInputType.VALUE,
            name: 'language',
            value: 'japanese',
          },
          {
            type: ChainInputType.PASS_THROUGH,
            name: 'input',
          },
          // TODO(burdon): Message.
          // {
          //   type: ChainInputType.CONTEXT,
          //   name: 'input',
          //   value: 'object.text',
          // },
        ],
      }),
  },
  {
    id: 'dxos.org/prompt/chess',
    title: 'Chess',
    prompt: () =>
      create(ChainPromptType, {
        command: 'hint',
        template: str(
          // prettier-ignore
          'You are a machine that is an expert chess player.',
          '',
          'The move history of the current game is: {history}',
          '',
          'Suggest the next move and very briefly explain your strategy in a couple of sentences.',
        ),
        inputs: [
          {
            type: ChainInputType.CONTEXT,
            name: 'history',
            value: 'object.pgn',
          },
        ],
      }),
  },
  {
    id: 'dxos.org/prompt/mermaid',
    title: 'Mermaid',
    prompt: () =>
      create(ChainPromptType, {
        command: 'draw',
        template: str(
          // prettier-ignore
          'Create a simplified mermaid graph representing the text below.',
          'Do not explain anything.',
          '',
          '---',
          '',
          '{input}',
        ),
        inputs: [
          {
            type: ChainInputType.PASS_THROUGH,
            name: 'input',
          },
        ],
      }),
  },
  {
    id: 'dxos.org/prompt/list',
    title: 'List',
    prompt: () =>
      create(ChainPromptType, {
        command: 'list',
        template: str(
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
        inputs: [
          {
            type: ChainInputType.SCHEMA,
            name: 'schema',
            value: 'example.com/type/project',
          },
          {
            type: ChainInputType.PASS_THROUGH,
            name: 'question',
          },
        ],
      }),
  },
  {
    id: 'dxos.org/prompt/base',
    title: 'RAG',
    prompt: () =>
      create(ChainPromptType, {
        command: 'rag',
        template: str(
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
        inputs: [
          {
            type: ChainInputType.RETRIEVER,
            name: 'context',
          },
          {
            type: ChainInputType.CONTEXT,
            name: 'question',
            value: 'object.text',
          },
        ],
      }),
  },
  {
    id: 'dxos.org/prompt/lookup',
    title: 'Lookup',
    prompt: () =>
      create(ChainPromptType, {
        command: 'lookup',
        template: str(
          // prettier-ignore
          'Lookup and very briefly summarize the following topic in one or two sentences:',
          '',
          '---',
          '',
          '{input}',
        ),
        inputs: [
          {
            type: ChainInputType.CONTEXT,
            name: 'input',
            value: 'text',
          },
        ],
      }),
  },
  {
    id: 'dxos.org/prompt/extract',
    title: 'Extract',
    prompt: () =>
      create(ChainPromptType, {
        command: 'extract',
        template: str(
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
        inputs: [
          {
            type: ChainInputType.SCHEMA,
            name: 'contact',
            value: 'example.com/type/contact',
          },
          {
            type: ChainInputType.SCHEMA,
            name: 'company',
            value: 'example.com/type/organization',
          },
          {
            type: ChainInputType.CONTEXT,
            name: 'input',
            value: 'text',
          },
        ],
      }),
  },
  {
    id: 'dxos.org/prompt/discord',
    title: 'Summarize',
    prompt: () =>
      create(ChainPromptType, {
        command: 'summarize',
        template: str(
          // prettier-ignore
          'Summarize what the team is working on and format it as a markdown table without any explanation.',
          '',
          '---',
          '',
          '{context}',
        ),
        inputs: [
          {
            type: ChainInputType.RESOLVER,
            name: 'context',
            value: 'discord.messages.recent',
          },
        ],
      }),
  },
];
