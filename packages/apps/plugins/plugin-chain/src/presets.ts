//
// Copyright 2024 DXOS.org
//

import { Chain as ChainType } from '@braneframe/types';
import { TextObject } from '@dxos/react-client/echo';

export const str = (...text: (string | undefined | boolean)[]): string =>
  text
    .filter((value) => value !== undefined && value !== false)
    .flat()
    .join('\n');

export type Preset = {
  id: string;
  title: string;
  signals?: () => ChainType.FunctionSignal[];
  prompt: () => ChainType.Prompt;
};

export const presets = [
  {
    id: 'dxos.org/prompt/translate',
    title: 'Translate',
    prompt: () =>
      new ChainType.Prompt({
        command: 'say',
        source: new TextObject(
          str(
            //
            'Translate the following into {language}:',
            '',
            '---',
            '',
            '{input}',
          ),
        ),
        inputs: [
          //
          new ChainType.Input({
            name: 'language',
            type: ChainType.Input.Type.VALUE,
            value: 'japanese',
          }),
          new ChainType.Input({ name: 'input', type: ChainType.Input.Type.PASS_THROUGH }),
        ],
      }),
  },
  {
    id: 'dxos.org/prompt/chess',
    title: 'Chess',
    prompt: () =>
      new ChainType.Prompt({
        command: 'hint',
        source: new TextObject(
          str(
            //
            'You are a machine that is an expert chess player.',
            '',
            'The move history of the current game is: {history}',
            '',
            'Suggest the next move and very briefly explain your strategy in a couple of sentences.',
          ),
        ),
        triggers: [
          new ChainType.Trigger({
            type: ChainType.Trigger.Type.ECHO,
            typename: 'dxos.experimental.chess.Game',
            compareBy: 'pgn',
            debounceMs: 1000,
            enabled: false,
          }),
        ],
        inputs: [
          //
          new ChainType.Input({
            name: 'history',
            type: ChainType.Input.Type.CONTEXT,
            value: 'object.pgn',
          }),
        ],
      }),
  },
  {
    id: 'dxos.org/prompt/mermaid',
    title: 'Mermaid',
    prompt: () =>
      new ChainType.Prompt({
        command: 'draw',
        source: new TextObject(
          str(
            //
            'Create a simplified mermaid graph representing the text below.',
            'Do not explain anything.',
            '',
            '---',
            '',
            '{input}',
          ),
        ),
        inputs: [
          //
          new ChainType.Input({ name: 'input', type: ChainType.Input.Type.PASS_THROUGH }),
        ],
      }),
  },
  {
    id: 'dxos.org/prompt/list',
    title: 'List',
    prompt: () =>
      new ChainType.Prompt({
        command: 'list',
        source: new TextObject(
          str(
            //
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
        ),
        inputs: [
          //
          new ChainType.Input({
            type: ChainType.Input.Type.SCHEMA,
            name: 'schema',
            value: 'example.com/schema/project',
          }),
          new ChainType.Input({ name: 'question', type: ChainType.Input.Type.PASS_THROUGH }),
        ],
      }),
  },
  {
    id: 'dxos.org/prompt/base',
    title: 'Base',
    prompt: () =>
      new ChainType.Prompt({
        command: 'base',
        source: new TextObject(
          str(
            //
            "Very briefly answer the question based only on the following context and say if you don't know the answer.",
            // 'answer the question using the following context as well as your training data:',
            '',
            '{context}',
            '',
            '---',
            '',
            'question: {question}',
          ),
        ),
        inputs: [
          //
          new ChainType.Input({ name: 'context', type: ChainType.Input.Type.RETRIEVER }),
          new ChainType.Input({ name: 'question', type: ChainType.Input.Type.PASS_THROUGH }),
        ],
      }),
  },
  {
    id: 'dxos.org/prompt/lookup',
    title: 'Lookup',
    prompt: () =>
      new ChainType.Prompt({
        command: 'lookup',
        source: new TextObject(
          str(
            //
            'Lookup and very briefly summarize the following topic in one or two sentences:',
            '',
            '---',
            '',
            '{input}',
          ),
        ),
        inputs: [
          //
          new ChainType.Input({ name: 'input', type: ChainType.Input.Type.CONTEXT, value: 'text' }),
        ],
      }),
    signals: () => [
      new ChainType.FunctionSignal({
        type: 'dxos.signal.extract-terms',
        inputs: [],
        triggers: [
          new ChainType.Trigger({
            type: ChainType.Trigger.Type.ECHO,
            typename: 'braneframe.Document',
            compareBy: 'content.content',
            debounceMs: 5000,
            enabled: false,
          }),
        ],
      }),
      new ChainType.FunctionSignal({
        type: 'dxos.signal.lookup-next-term',
        inputs: [],
        triggers: [
          new ChainType.Trigger({
            type: ChainType.Trigger.Type.TIMER,
            typename: 'Timer',
            debounceMs: 5000,
            enabled: false,
          }),
        ],
      }),
    ],
  },
  {
    id: 'dxos.org/prompt/extract',
    title: 'Extract',
    prompt: () =>
      new ChainType.Prompt({
        command: 'extract',
        source: new TextObject(
          str(
            //
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
        ),
        inputs: [
          //
          new ChainType.Input({
            type: ChainType.Input.Type.SCHEMA,
            name: 'contact',
            value: 'example.com/schema/contact',
          }),
          new ChainType.Input({
            type: ChainType.Input.Type.SCHEMA,
            name: 'company',
            value: 'example.com/schema/organization',
          }),
          new ChainType.Input({ name: 'input', type: ChainType.Input.Type.CONTEXT, value: 'text' }),
        ],
      }),
  },
  {
    id: 'dxos.org/prompt/discord',
    title: 'Summarize',
    prompt: () =>
      new ChainType.Prompt({
        command: 'summarize',
        source: new TextObject(
          str(
            //
            'Summarize what the team is working on and format it as a markdown table without any explanation.',
            '',
            '---',
            '',
            '{context}',
          ),
        ),
        inputs: [
          //
          new ChainType.Input({
            name: 'context',
            type: ChainType.Input.Type.RESOLVER,
            value: 'discord.messages.recent',
          }),
        ],
      }),
  },
];
