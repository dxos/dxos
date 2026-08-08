#!/usr/bin/env node

//
// Copyright 2025 DXOS.org
//

import * as BunRuntime from '@effect/platform-bun/BunRuntime';
import * as BunServices from '@effect/platform-bun/BunServices';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as Logger from 'effect/Logger';
import * as Option from 'effect/Option';
import * as Command from 'effect/unstable/cli/Command';

import { createCliApp } from '@dxos/app-framework/cli';
import { unrefTimeout } from '@dxos/async';
import { ConfigService, DXOS_VERSION } from '@dxos/client';
import { DEFAULT_PROFILE } from '@dxos/client-protocol';
import { LogLevel, levels, log } from '@dxos/log';
import { loadEnabledPlugins } from '@dxos/plugin-registry';

import { admin, chat, commandConfigLayer, debug, dx, fn, hub, mailbox, mcp, reflect, repl, reset } from './commands';
import { getDefaults, getPlugins } from './commands/plugin-defs';
import { setDispatcher } from './dispatcher';
import { installStderrFilter } from './util';

// Filter background `warnAfterTimeout` chatter out of stderr for the lifetime
// of the process. The warnings come from eager space initialisation in
// ClientPlugin and similar — they're noise to a user running e.g.
// `dx space list`. Set DX_KEEP_WARNINGS=1 to opt out.
if (!process.env.DX_KEEP_WARNINGS) {
  installStderrFilter();
}

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
  version: DXOS_VERSION,
};

/**
 * Reads a root flag straight off `process.argv`.
 *
 * `--profile` and `--config` have to be known *before* the command tree is built, because they
 * select which plugins and config the tree is assembled from — and v4's CLI exposes no way to parse
 * a command's flags without also running it. Only the long form and its single-letter alias are
 * recognized, which is what `dx --help` documents.
 */
const readRootFlag = (name: string, alias: string): string | undefined => {
  const argv = process.argv.slice(2);
  for (let index = 0; index < argv.length; ++index) {
    const arg = argv[index];
    if (arg === `--${name}` || arg === `-${alias}`) {
      return argv[index + 1];
    }
    if (arg.startsWith(`--${name}=`)) {
      return arg.slice(name.length + 3);
    }
  }
  return undefined;
};

const program = Effect.gen(function* () {
  const argv = process.argv.slice(2);
  const profile = readRootFlag('profile', 'p') ?? DEFAULT_PROFILE;
  const configPath = readRootFlag('config', 'c');
  const config = yield* ConfigService.load({ config: Option.fromNullishOr(configPath), profile });

  const savedEnabled = yield* loadEnabledPlugins({ profile });
  const enabled = savedEnabled.length > 0 ? [...savedEnabled] : getDefaults();

  const { command, layer: pluginLayer } = yield* createCliApp({
    rootCommand: dx,
    subCommands: [
      repl,
      reset,

      // TODO(wittjosiah): Factor out.
      //   Currently would require standalone plugins due to clash between solid & react compilation.
      //   Either create cli-specific plugins for these or wait until assistant/script plugins are built w/ Solid.
      // Note: ClientPlugin already contributes ClientService via its layer, so we don't need to provide it again.
      chat,
      fn,
      mailbox,
      mcp,

      // TODO(burdon): Admin-only. Where should these commands live?
      admin,
      debug,
      hub,
      reflect,
    ],
    plugins: getPlugins({ config }),
    enabled,
  });

  // Built once in the program scope, so each `Effect.provide(layer)` — both the top-level command
  // and every REPL dispatch — reuses the already-constructed services (ClientPlugin, Config, etc.)
  // instead of rebuilding them per invocation.
  const context = yield* Layer.build(
    Layer.mergeAll(pluginLayer, ConfigService.fromConfig(config), commandConfigLayer(argv)),
  );
  const layer = Layer.succeedContext(context);

  // Register in-process dispatcher so `repl` can reuse the already-built
  // command tree and plugin layer instead of spawning a child `dx` process
  // per command. See src/dispatcher.ts.
  // NOTE: The final `as` matches the same Effect type-system workaround
  // applied at the outer `program` scope — `Command.run`'s inferred
  // `Requirements` channel becomes overly restrictive even when the layer
  // provides everything.
  setDispatcher(
    (argv) =>
      Command.runWith(command, CLI_CONFIG)(argv).pipe(Effect.provide(layer)) as Effect.Effect<void, unknown, never>,
  );

  // `runWith` takes the ARGUMENTS, not the raw argv — passing `process.argv` makes the interpreter
  // path the first token, which parses as an unknown subcommand.
  return yield* Command.runWith(command, CLI_CONFIG)(argv).pipe(Effect.provide(layer));
}).pipe(
  Effect.provide(Layer.mergeAll(BunServices.layer, Logger.layer([Logger.consolePretty()]))),
  Effect.scoped,
  // Work around Effect type system limitation where Requirements type becomes overly restrictive.
) as Effect.Effect<void, unknown>;

BunRuntime.runMain(program, {
  teardown: (exit, onExit) => {
    const exitCode = Exit.isFailure(exit) && !Cause.hasInterruptsOnly(exit.cause) ? 1 : 0;
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
