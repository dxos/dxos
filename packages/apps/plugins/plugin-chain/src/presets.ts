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
            'Translate the following into {language}.',
            '---',
            '{input}',
          ),
        ),
        inputs: [
          //
          new ChainType.Input({
            type: ChainType.Input.Type.VALUE,
            name: 'language',
            value: new TextObject('japanese'),
          }),
          new ChainType.Input({ type: ChainType.Input.Type.PASS_THROUGH, name: 'input' }),
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
        inputs: [
          //
          new ChainType.Input({
            type: ChainType.Input.Type.CONTEXT,
            name: 'history',
            value: new TextObject('object.pgn'),
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
            'Create a valid mermaid diagram representing the text below.',
            'Do not explain anything.',
            '---',
            '{input}',
          ),
        ),
        inputs: [
          //
          new ChainType.Input({ type: ChainType.Input.Type.PASS_THROUGH, name: 'input' }),
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
            '',
            'Your entire response should be a single array of JSON objects.',
            '',
            'Each item should contain the following fields: {schema}',
            '---',
            '{question}',
          ),
        ),
        inputs: [
          //
          new ChainType.Input({
            type: ChainType.Input.Type.CONTEXT,
            name: 'schema',
            value: new TextObject('schema.props'),
          }),
          new ChainType.Input({ type: ChainType.Input.Type.PASS_THROUGH, name: 'question' }),
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
            '---',
            'question: {question}',
          ),
        ),
        inputs: [
          //
          new ChainType.Input({ type: ChainType.Input.Type.RETRIEVER, name: 'context' }),
          new ChainType.Input({ type: ChainType.Input.Type.PASS_THROUGH, name: 'question' }),
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
            '---',
            '{input}',
          ),
        ),
        inputs: [
          //
          new ChainType.Input({ type: ChainType.Input.Type.CONTEXT, name: 'input', value: new TextObject('text') }),
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
            '---',
            '{context}',
          ),
        ),
        inputs: [
          //
          new ChainType.Input({
            type: ChainType.Input.Type.RESOLVER,
            name: 'context',
            value: new TextObject('discord.messages.recent'),
          }),
        ],
      }),
  },
];
