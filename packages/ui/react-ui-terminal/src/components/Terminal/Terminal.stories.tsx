//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Args from 'effect/unstable/cli/Argument';
import * as Command from 'effect/unstable/cli/Command';
import * as Options from 'effect/unstable/cli/Flag';
import * as Prompt from 'effect/unstable/cli/Prompt';
import React, { useMemo } from 'react';
import { userEvent } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { runCommand, waitForTerminal } from '../../testing';
import { Terminal } from './Terminal';

const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

//
// A self-contained command tree. Mounting a real CLI against a DXOS client is the CliPanel story
// in plugin-devtools, which is also what ships as the devtools panel.
//

const greet = Command.make(
  'greet',
  {
    name: Args.string('name'),
    loud: Options.boolean('loud').pipe(Options.withDescription('Shout the greeting.')),
  },
  ({ name, loud }) => Console.log(loud ? `HELLO, ${name.toUpperCase()}!` : `Hello, ${name}.`),
).pipe(Command.withDescription('Greet someone by name.'));

const ask = Command.make('ask', {}, () =>
  Effect.gen(function* () {
    const name = yield* Prompt.text({ message: 'What is your name?' });
    const color = yield* Prompt.select({
      message: 'Pick a color',
      choices: [
        { title: 'Cyan', value: CYAN },
        { title: 'Magenta', value: '\x1b[35m' },
        { title: 'Yellow', value: '\x1b[33m' },
      ],
    });

    yield* Console.log(`${color}Nice to meet you, ${name}.${RESET}`);
  }),
).pipe(Command.withDescription('Interactive prompts, driven by the terminal key stream.'));

const colors = Command.make('colors', {}, () =>
  Console.log(
    Array.from({ length: 8 }, (_, index) => `\x1b[3${index}m██\x1b[0m`).join('') +
      `\n${BOLD}bold${RESET} ${DIM}dim${RESET} \x1b[4munderline${RESET}`,
  ),
).pipe(Command.withDescription('Show that ANSI styling renders.'));

const demo = Command.make('demo').pipe(Command.withSubcommands([greet, ask, colors]));

const DefaultStory = () => {
  const command = useMemo(() => demo, []);

  return (
    <Terminal
      command={command}
      layer={Layer.empty}
      name='demo'
      banner={`${BOLD}Effect CLI in the browser${RESET}\n${DIM}Try: greet world --loud · ask · colors · help${RESET}`}
    />
  );
};

const meta = {
  title: 'ui/react-ui-terminal/Terminal',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * Drives the shell end to end: a command is parsed, run, and its output rendered.
 */
export const Spec: Story = {
  play: async ({ canvasElement }) => {
    await waitForTerminal(canvasElement, 'demo>');

    await runCommand(canvasElement, 'greet world', userEvent.keyboard);
    await waitForTerminal(canvasElement, 'Hello, world.');

    // Options are parsed, not merely echoed.
    await runCommand(canvasElement, 'greet ada --loud', userEvent.keyboard);
    await waitForTerminal(canvasElement, 'HELLO, ADA!');

    // An unknown command is reported once, by the CLI itself — which answers with the command's
    // help rather than a one-line message.
    await runCommand(canvasElement, 'bogus', userEvent.keyboard);
    await waitForTerminal(canvasElement, 'USAGE');

    // The shell survives the failure and keeps accepting commands.
    await runCommand(canvasElement, 'greet again', userEvent.keyboard);
    await waitForTerminal(canvasElement, 'Hello, again.');
  },
};
