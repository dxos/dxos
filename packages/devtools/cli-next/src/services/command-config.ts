//
// Copyright 2025 DXOS.org
//

import { Context, Effect } from 'effect';

export class CommandConfig extends Context.Tag('CommandConfig')<CommandConfig, { json: boolean; verbose: boolean }>() {
  static isJson: Effect.Effect<boolean, never, CommandConfig> = CommandConfig.pipe(Effect.map((config) => config.json));
  static isVerbose: Effect.Effect<boolean, never, CommandConfig> = CommandConfig.pipe(
    Effect.map((config) => config.verbose),
  );
}
