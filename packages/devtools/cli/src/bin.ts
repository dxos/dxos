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

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { createCliApp } from '@dxos/app-framework/cli';
import * as AppMigrations from '@dxos/app-toolkit/AppMigrations';
import { unrefTimeout } from '@dxos/async';
import { ClientService, ConfigService, DXOS_VERSION, fromConfig } from '@dxos/client';
import { DEFAULT_PROFILE, DXEnv } from '@dxos/client-protocol';
import { LogLevel, levels, log } from '@dxos/log';
import * as Observability from '@dxos/observability/Observability';
import { isRecordEnabled, loadPlugins, makeInstalledPlugins } from '@dxos/plugin-registry';

import {
  admin,
  chat,
  commandConfigLayer,
  debug,
  dx,
  fn,
  hub,
  mailbox,
  mcp,
  reflect,
  repl,
  reset,
  telemetry,
} from './commands';
import { getCore, getDefaults, getPlugins } from './commands/plugin-defs';
import { setDispatcher } from './dispatcher';
import {
  commandPath,
  flushObservability,
  identifySession,
  initializeObservability,
  observabilityNamespace,
} from './observability';
import { installStderrFilter, registerSharedScope } from './util';

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

// Before any command can create a space: an unset `Migrations.targetVersion` stamps no version, and
// Composer then reports the space as pending migration.
AppMigrations.define();

let leaksTracker: any;
if (process.env.DX_TRACK_LEAKS) {
  const wtf = await import('wtfnode');
  leaksTracker = wtf;
}

const EXIT_GRACE_PERIOD = 1_000;
/**
 * A command that has printed its answer must not wait on telemetry to exit. A reachable endpoint
 * flushes in well under this; an unreachable one costs at most this much, once, and loses the batch.
 */
const FLUSH_TIMEOUT = 500;
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

/**
 * True for `dx mcp serve --watch`, which is dispatched before anything else is built.
 *
 * The supervisor only proxies stdio to a child that does the real work, so booting the plugin
 * layer and command tree for it would pay the CLI's whole startup twice in sequence — measured at
 * 6.5s to 11s warm, and far worse cold, which pushes the first connection past an MCP client's
 * startup timeout and reads as a hang.
 */
const isWatchSupervisor = (argv: readonly string[]): boolean => {
  if (argv.includes('--help') || argv.includes('-h')) {
    return false;
  }
  const serve = argv.indexOf('serve');
  // Bare `--watch` only: `--watch=false` means watch OFF, and any `--watch=…` form is left to the
  // real parser — a miss costs a slow start via `serve.ts`'s own branch, never wrong behavior.
  return serve > 0 && argv[serve - 1] === 'mcp' && argv.includes('--watch');
};

const program = Effect.gen(function* () {
  const argv = process.argv.slice(2);

  // Before `ConfigService.load` and the command tree: see `isWatchSupervisor`. `serve.ts` keeps an
  // equivalent branch so a miss here degrades to a slow start rather than an unknown flag.
  if (isWatchSupervisor(argv)) {
    const { runWatchSupervisor } = yield* Effect.promise(() => import('./commands/mcp/watch'));
    return yield* runWatchSupervisor();
  }

  // The same resolution `commandConfigLayer` uses, so the profile the client opens is the profile
  // whose telemetry consent is read.
  const profile = readRootFlag('profile', 'p') ?? DXEnv.get(DXEnv.PROFILE, DEFAULT_PROFILE);
  const configPath = readRootFlag('config', 'c');
  const config = yield* ConfigService.load({ config: Option.fromNullishOr(configPath), profile });

  // `undefined` means the profile has never been configured; an empty array means the user
  // turned everything optional off, which must not be re-seeded with the defaults.
  const records = yield* loadPlugins({ profile });
  const enabled = records?.filter(isRecordEnabled).map((record) => record.id) ?? getDefaults();
  // Third-party installs register as lazy stubs built from the metadata cached at install time, so
  // a `dx` invocation imports a plugin's code only once something enables it.
  const installed = makeInstalledPlugins(records ?? []);
  const overridden = new Set(installed.map((plugin) => plugin.meta.profile.key));
  // Must precede any plugin import so a third-party plugin's bare specifiers resolve to the host's
  // module instances rather than its own copies.
  registerSharedScope({ enabled: installed.length > 0 });

  const namespace = observabilityNamespace(profile);
  const installationId = yield* Effect.promise(() => Observability.getInstallationId(namespace));
  // Started here and awaited by the plugin's module, so extension setup overlaps plugin activation.
  const observability = initializeObservability({ config, namespace, distinctId: installationId });

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
      telemetry,
    ],
    // Installs come first, and the builtin they claim is dropped rather than left as an
    // unreachable duplicate: both the manager's lookup and the CLI's plugin loader take the first
    // match by key, so `add --dev` only overrides a builtin if its plugin precedes that builtin.
    plugins: [
      ...installed,
      ...getPlugins({ config, namespace, observability: () => observability }).filter(
        (plugin) => !overridden.has(plugin.meta.profile.key),
      ),
    ],
    enabled,
    core: getCore(),
  });

  // Built once in the program scope, so each `Effect.provide(layer)` — both the top-level command
  // and every REPL dispatch — reuses the already-constructed services (ClientPlugin, Config, etc.)
  // instead of rebuilding them per invocation.
  const context = yield* Layer.build(Layer.mergeAll(pluginLayer, fromConfig(config), commandConfigLayer(argv)));
  const layer = Layer.succeedContext(context);

  // `Idle` is what the observability plugin's invocation listener activates on, and nothing else
  // fires it for a plain command — without it every operation this run invokes goes unreported.
  const manager = yield* Capability.get(Capabilities.PluginManager).pipe(Effect.provide(layer));
  yield* manager.activate(ActivationEvents.Idle);

  const observabilityInstance = yield* Effect.promise(() => observability);
  identifySession(observabilityInstance, yield* ClientService.pipe(Effect.provide(layer)), installationId);

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

  const startedAt = Date.now();
  // `runWith` takes the ARGUMENTS, not the raw argv — passing `process.argv` makes the interpreter
  // path the first token, which parses as an unknown subcommand.
  return yield* Command.runWith(
    command,
    CLI_CONFIG,
  )(argv).pipe(
    Effect.provide(layer),
    // Captured on the way out so the event carries the outcome. A session killed outright reports
    // nothing, which is why `dx mcp serve` has events of its own.
    Effect.onExit((exit) =>
      Effect.sync(() =>
        observabilityInstance.events.captureEvent('cli.command', {
          command: commandPath(argv),
          ok: Exit.isSuccess(exit),
          durationMs: Date.now() - startedAt,
        }),
      ),
    ),
    Effect.ensuring(flushObservability(observabilityInstance, FLUSH_TIMEOUT)),
  );
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
