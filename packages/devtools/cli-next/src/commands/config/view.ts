import { Command } from '@effect/cli';
import { Effect } from 'effect';
import { ConfigService } from '../../services';
import { colorize } from 'json-colorizer';

export const view = Command.make(
  'view',
  {},
  Effect.fnUntraced(function* () {
    const config = yield* ConfigService;
    console.log(colorize(config.values));
  }),
);
