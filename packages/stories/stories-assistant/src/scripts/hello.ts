//
// Copyright 2026 DXOS.org
//

import { ScriptedLanguageModel, ScriptedScene } from '@dxos/ai/testing';
import * as Operation from '@dxos/compute/Operation';

import { Calculate } from '../testing/calculator.ts';

const { reasoning, text, toolCall } = ScriptedLanguageModel;
const { find, scene } = ScriptedScene;

/** The smallest script: one scene that only talks, and one that calls a tool and reads back its result. */
export const hello: readonly ScriptedScene.Scene[] = [
  scene('haiku', /haiku/i, [
    {
      delay: '1 second',
      parts: [reasoning('Five, seven, five.'), text('Local-first and calm\nyour notes wait for you offline\nthen sync like the tide')],
    },
  ]),

  scene('sum', /what is \d+ × \d+/i, [
    // A tool call ends the turn; the next turn sees its result.
    { parts: [text('Let me work that out.'), toolCall(Operation.toolName(Calculate), { expression: '17 * 23' })] },
    // Deferred: the reply is built from the request, so it can quote what the tool returned.
    { parts: [text((request) => `17 × 23 = ${find(request, /"result":\s*"?(\d+)/) ?? '391'}.`)] },
  ]),
];
