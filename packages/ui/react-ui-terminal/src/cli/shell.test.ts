//
// Copyright 2026 DXOS.org
//

import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Command from 'effect/unstable/cli/Command';
import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import * as XtermContext from './context.ts';
import { runShell } from './shell.ts';
import { TestBridge } from './testing.ts';

// The line editor redraws its row before each prompt: return to column 0 and clear the line.
const PROMPT = '\r\x1b[Kdemo> ';

const hello = Command.make('hello', {}, () => Console.log('Hello.'));
const quiet = Command.make('quiet', {}, () => Effect.void);
const demo = Command.make('demo').pipe(Command.withSubcommands([hello, quiet]));

/** Types each line and ends the session, returning everything the shell wrote. */
const session = async (...lines: string[]): Promise<string> => {
  const bridge = new TestBridge();
  const shell = EffectEx.runPromise(
    runShell(bridge, { command: demo, name: 'demo' }).pipe(Effect.provide(XtermContext.layer(bridge))),
  );
  for (const line of [...lines, 'exit']) {
    // A turn for the shell to reach its prompt, so each line lands on the editor that asked for it.
    await new Promise((resolve) => setTimeout(resolve, 10));
    bridge.send(`${line}\r`);
  }
  await shell;
  return bridge.rendered;
};

describe('runShell', () => {
  test('a response is followed by a blank line before the next prompt', async ({ expect }) => {
    const output = await session('hello');
    expect(output).to.contain(`Hello.\n\n${PROMPT}`);
  });

  test('a command that prints nothing adds no blank line', async ({ expect }) => {
    const output = await session('quiet');
    expect(output).to.contain(`quiet\n${PROMPT}`);
  });
});
