//
// Copyright 2026 DXOS.org
//

import { ScriptedScene } from '@dxos/ai/testing';
import * as Operation from '@dxos/compute/Operation';

import { Calculate } from '../testing/calculator.ts';

const { conversation, capture, reasoning, text, toolCall, turn } = ScriptedScene;

/** The smallest script: one conversation that only talks, and one that calls a tool and reads back its result. */
export const hello: readonly ScriptedScene.Conversation[] = [
  conversation('haiku', [
    turn('user', 'Write me a haiku'),
    turn(
      'assistant',
      [
        reasoning('Five, seven, five.'),
        text('Local-first and calm\nyour notes wait for you offline\nthen sync like the tide'),
      ],
      { delay: '1 second' },
    ),
  ]),

  conversation('sum', [
    turn('user', `What is ${capture('a', /\d+/)} × ${capture('b', /\d+/)}`),
    // A tool call ends the turn; the tool's answer comes back before the next one.
    turn('assistant', [
      text('Let me work that out.'),
      toolCall(Operation.toolName(Calculate), {
        expression: `${capture('a')} * ${capture('b')}`,
      }),
    ]),
    turn('tool', `"result":${capture('result', /[\d.]+/)}`),
    turn('assistant', [text(`${capture('a')} × ${capture('b')} = ${capture('result')}.`)]),
  ]),
];
