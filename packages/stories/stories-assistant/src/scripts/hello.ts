//
// Copyright 2026 DXOS.org
//

import { ScriptedScene } from '@dxos/ai/testing';
import * as Operation from '@dxos/compute/Operation';

import { Calculate } from '../testing/calculator.ts';

/** The smallest script: one conversation that only talks, and one that calls a tool and reads back its result. */
export const hello = ScriptedScene.make([
  ScriptedScene.conversation('haiku', [
    ScriptedScene.turn('user', 'Write me a haiku'),
    ScriptedScene.turn(
      'assistant',
      [
        ScriptedScene.reasoning('Five, seven, five.'),
        ScriptedScene.text('Local-first and calm\nyour notes wait for you offline\nthen sync like the tide'),
      ],
      { delay: '1 second' },
    ),
  ]),

  ScriptedScene.conversation('sum', [
    ScriptedScene.turn('user', `What is ${ScriptedScene.capture('a', /\d+/)} × ${ScriptedScene.capture('b', /\d+/)}`),
    // A tool call ends the turn; the tool's answer comes back before the next one.
    ScriptedScene.turn('assistant', [
      ScriptedScene.text('Let me work that out.'),
      ScriptedScene.toolCall(Operation.toolName(Calculate), {
        expression: `${ScriptedScene.capture('a')} * ${ScriptedScene.capture('b')}`,
      }),
    ]),
    ScriptedScene.turn('tool', `"result":${ScriptedScene.capture('result', /[\d.]+/)}`),
    ScriptedScene.turn('assistant', [
      ScriptedScene.text(
        `${ScriptedScene.capture('a')} × ${ScriptedScene.capture('b')} = ${ScriptedScene.capture('result')}.`,
      ),
    ]),
  ]),
]);
