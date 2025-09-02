import { Command } from '@effect/cli';
import { query } from './query';
import { remove } from './remove';

export const object = Command.make('object').pipe(
  Command.withDescription('Manage objects.'),
  Command.withSubcommands([query, remove]),
);
