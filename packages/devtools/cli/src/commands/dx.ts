//
// Copyright 2025 DXOS.org
//

import * as Config from 'effect/Config';
import * as Layer from 'effect/Layer';
import * as Command from 'effect/unstable/cli/Command';
import * as Options from 'effect/unstable/cli/Flag';

import { CommandConfig } from '@dxos/cli-util';
import { DEFAULT_PROFILE, DXEnv } from '@dxos/client-protocol';

/**
 * Root flags, declared as SHARED so they parse anywhere in the argv — `dx --json space list` as well
 * as `dx space list --json`. A plain `Command.make` config is only parsed when `dx` itself is the
 * leaf command, which makes every pre-subcommand root flag an unknown token.
 */
export const dx = Command.make('dx').pipe(
  Command.withSharedFlags({
    config: Options.file('config', { mustExist: true }).pipe(
      Options.withDescription('Config file path.'),
      Options.withAlias('c'),
      Options.optional,
    ),
    // TODO(burdon): CommandConfig layer should throw if profile doesn't exist.
    profile: Options.string('profile').pipe(
      Options.withDescription('Profile for the config file.'),
      Options.withAlias('p'),
      Options.withFallbackConfig(Config.string(DXEnv.PROFILE).pipe(Config.withDefault(DEFAULT_PROFILE))),
      Options.withDefault(DXEnv.get(DXEnv.PROFILE, DEFAULT_PROFILE)),
    ),
    json: Options.boolean('json').pipe(
      Options.withDescription('JSON output.'),
      Options.withFallbackConfig(Config.boolean('JSON').pipe(Config.withDefault(false))),
    ),
    verbose: Options.boolean('verbose').pipe(
      Options.withDescription('Verbose logging.'),
      Options.withAlias('v'),
      Options.withFallbackConfig(Config.boolean('VERBOSE').pipe(Config.withDefault(false))),
    ),
    logLevel: Options.choice('logLevel', ['debug', 'verbose', 'info', 'warn', 'error']).pipe(
      Options.withDescription('Log level to use.'),
      Options.withAlias('l'),
      Options.withDefault(DXEnv.get(DXEnv.DEBUG, 'info')),
    ),
    timeout: Options.integer('timeout').pipe(
      Options.withDescription('The timeout before the command fails.'),
      Options.optional,
    ),
  }),
);

/**
 * Reads a root flag straight off `process.argv`.
 *
 * Only the long form and its single-letter alias are recognized, which is what `dx --help`
 * documents.
 */
const readRootFlag = (argv: readonly string[], name: string, alias?: string): string | undefined => {
  for (let index = 0; index < argv.length; ++index) {
    const arg = argv[index];
    if (arg === `--${name}` || (alias !== undefined && arg === `-${alias}`)) {
      return argv[index + 1] ?? '';
    }
    if (arg.startsWith(`--${name}=`)) {
      return arg.slice(name.length + 3);
    }
  }
  return undefined;
};

const readRootBoolean = (argv: readonly string[], name: string, alias?: string): boolean | undefined => {
  const value = readRootFlag(argv, name, alias);
  if (value === undefined) {
    return undefined;
  }
  return value !== 'false';
};

/**
 * {@link CommandConfig} for the whole tree, resolved from the root flags declared above.
 *
 * `Command.provide` only wraps the command's OWN handler — a subcommand never sees it — so the root
 * flags have to be read off argv and provided as an ambient layer instead. Values and defaults
 * mirror the flag declarations above; keep the two in step.
 */
export const commandConfigLayer = (argv: readonly string[]): Layer.Layer<CommandConfig> =>
  Layer.succeed(CommandConfig, {
    json: readRootBoolean(argv, 'json') ?? process.env.JSON === 'true',
    verbose: readRootBoolean(argv, 'verbose', 'v') ?? process.env.VERBOSE === 'true',
    profile: readRootFlag(argv, 'profile', 'p') ?? DXEnv.get(DXEnv.PROFILE, DEFAULT_PROFILE),
    logLevel: readRootFlag(argv, 'logLevel', 'l') ?? DXEnv.get(DXEnv.DEBUG, 'info'),
  });
