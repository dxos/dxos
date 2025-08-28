import { Context, Effect } from 'effect';
import { Struct } from 'effect/Schema';

export class CommandConfig extends Context.Tag('CommandConfig')<CommandConfig, { json: boolean; verbose: boolean }>() {
  static isJson: Effect.Effect<boolean, never, CommandConfig> = CommandConfig.pipe(Effect.map((config) => config.json));
  static isVerbose: Effect.Effect<boolean, never, CommandConfig> = CommandConfig.pipe(
    Effect.map((config) => config.verbose),
  );
}
