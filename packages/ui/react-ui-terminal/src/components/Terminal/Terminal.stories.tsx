//
// Copyright 2026 DXOS.org
//

import * as Args from '@effect/cli/Args';
import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Prompt from '@effect/cli/Prompt';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import React, { useMemo } from 'react';

import { CommandConfig } from '@dxos/cli-util';
import { ClientService } from '@dxos/client';
import { Database } from '@dxos/echo';
import { database, queue, space as spaceCommand } from '@dxos/plugin-space/commands';
import { useClient } from '@dxos/react-client';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Terminal } from './Terminal';

const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

//
// A self-contained command tree, to exercise the terminal without any DXOS services.
//

const greet = Command.make(
  'greet',
  {
    name: Args.text({ name: 'name' }),
    loud: Options.boolean('loud', { ifPresent: true }).pipe(Options.withDescription('Shout the greeting.')),
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

const DemoStory = () => {
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

//
// The real dx command tree, against a live in-browser client.
//

const DxStory = () => {
  const client = useClient();
  const { space } = useClientStory();

  const cli = useMemo(() => {
    if (!space) {
      return undefined;
    }

    const command = Command.make('dx', {
      json: Options.boolean('json', { ifPresent: true }).pipe(Options.withDescription('JSON output.')),
    }).pipe(
      Command.provide(({ json }) =>
        Layer.succeed(CommandConfig, { json, verbose: false, profile: 'default', logLevel: 'info' }),
      ),
      Command.withSubcommands([spaceCommand, database, queue]),
    );

    const layer = Layer.mergeAll(ClientService.fromClient(client), Database.layer(space.db));
    return { command, layer };
  }, [client, space]);

  if (!cli) {
    return null;
  }

  return (
    <Terminal
      command={cli.command}
      layer={cli.layer}
      name='dx'
      banner={`${BOLD}DXOS CLI${RESET}\n${DIM}Try: space list · database query · space --help${RESET}`}
    />
  );
};

const meta = {
  title: 'ui/react-ui-terminal/Terminal',
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;

export const Default: StoryObj<typeof meta> = {
  render: () => <DemoStory />,
};

export const DxCli: StoryObj<typeof meta> = {
  render: () => <DxStory />,
  decorators: [withClientProvider({ createIdentity: true, createSpace: true })],
};
