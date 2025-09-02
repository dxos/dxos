import { Command } from '@effect/cli';
import { inspector } from './inspector';

export const debug = Command.make('debug').pipe(
  Command.withDescription('Debug commands.'),
  Command.withSubcommands([inspector]),
);
