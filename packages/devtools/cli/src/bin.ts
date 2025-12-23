#!/usr/bin/env node

//
// Copyright 2025 DXOS.org
//

import * as CliConfig from '@effect/cli/CliConfig';
import * as Command from '@effect/cli/Command';
import * as CommandDescriptor from '@effect/cli/CommandDescriptor';
import * as CommandDirective from '@effect/cli/CommandDirective';
import * as BunContext from '@effect/platform-bun/BunContext';
import * as BunRuntime from '@effect/platform-bun/BunRuntime';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as Logger from 'effect/Logger';
import * as Option from 'effect/Option';

import { createCliApp } from '@dxos/app-framework';
import { unrefTimeout } from '@dxos/async';
import { ClientService, ConfigService, DXOS_VERSION } from '@dxos/client';
import { LogLevel, levels, log } from '@dxos/log';

import { chat, debug, dx, fn, hub, repl } from './commands';
import { getCore, getDefaults, getPlugins } from './commands/plugin-defs';

let filter = LogLevel.ERROR;
const level = process.env.DX_DEBUG;
if (level) {
  filter = levels[level] ?? LogLevel.ERROR;
}
log.config({ filter });

let leaksTracker: any;
if (process.env.DX_TRACK_LEAKS) {
  const wtf = await import('wtfnode');
  leaksTracker = wtf;
}

const EXIT_GRACE_PERIOD = 1_000;
const FORCE_EXIT = true;
const CLI_CONFIG = {
  name: 'DXOS CLI',
  version: DXOS_VERSION,
};

const program = Effect.gen(function* () {
  const directive = yield* CommandDescriptor.parse(
    ['dx', ...process.argv.slice(2)],
    CliConfig.defaultConfig,
  )(dx.descriptor);
  const value = CommandDirective.isUserDefined(directive) ? Option.some(directive.value) : Option.none();
  const config = yield* value.pipe(
    Option.map((v) => ConfigService.load(v)),
    Option.getOrElse(() => Effect.succeed(undefined)),
  );

  const { command, layer: pluginLayer } = yield* createCliApp({
    rootCommand: dx,
    subCommands: [
      repl,

      // TODO(wittjosiah): Factor out.
      //   Currently would require standalone plugins due to clash between solid & react compilation.
      //   Either create cli-specific plugins for these or wait until assistant/script plugins are built w/ Solid.
      chat.pipe(Command.provide(ClientService.layer)),
      fn.pipe(Command.provide(ClientService.layer)),

      // TODO(burdon): Admin-only. Where should these commands live?
      debug.pipe(Command.provide(ClientService.layer)),
      hub.pipe(Command.provide(ClientService.layer)),
    ],
    plugins: getPlugins({ config }),
    core: getCore(),
    defaults: getDefaults(),
  });

  const layer = Layer.merge(pluginLayer, config ? ConfigService.fromConfig(config) : Layer.empty);
  return yield* Command.run(command, CLI_CONFIG)(process.argv).pipe(Effect.provide(layer));
}).pipe(
  Effect.provide(Layer.mergeAll(BunContext.layer, Logger.pretty)),
  Effect.scoped,
  // Work around Effect type system limitation where Requirements type becomes overly restrictive.
) as Effect.Effect<void, unknown>;

BunRuntime.runMain(program, {
  teardown: (exit, onExit) => {
    const exitCode = Exit.isFailure(exit) && !Cause.isInterruptedOnly(exit.cause) ? 1 : 0;
    onExit(exitCode);
    if (FORCE_EXIT) {
      process.exit(exitCode);
    } else {
      const timeout = setTimeout(() => {
        log.error('Process did not exit within grace period. There may be a leak.');
        if (process.env.DX_TRACK_LEAKS) {
          leaksTracker.dump();
        } else {
          log.error('Re-run with DX_TRACK_LEAKS=1 to dump information about leaks.');
        }
      }, EXIT_GRACE_PERIOD);

      // Don't block process exit.
      unrefTimeout(timeout);
    }
  },
});
