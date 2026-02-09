//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

export class CommandConfig extends Context.Tag('CommandConfig')<
  CommandConfig,
  {
    json: boolean;
    verbose: boolean;
    profile: string;
    logLevel: string;
  }
>() {
  static isJson: Effect.Effect<boolean, never, CommandConfig> = CommandConfig.pipe(Effect.map((config) => config.json));
  static isVerbose: Effect.Effect<boolean, never, CommandConfig> = CommandConfig.pipe(
    Effect.map((config) => config.verbose),
  );

  static layerTest = Layer.succeed(CommandConfig, {
    json: true,
    verbose: false,
    profile: 'default',
    logLevel: 'info',
  });
}
