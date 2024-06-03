//
// Copyright 2022 DXOS.org
//

import { Args, Command, type Config as OclifConfig, Flags, type Interfaces, settings } from '@oclif/core';
import chalk from 'chalk';
import * as fs from 'fs-extra';
import yaml from 'js-yaml';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import { dirname, join } from 'node:path';
import readline from 'node:readline';
import pkgUp from 'pkg-up';

import { type Daemon, LaunchctlRunner, PhoenixDaemon, SystemctlRunner, SystemDaemon } from '@dxos/agent';
import { Client, Config } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { fromAgent } from '@dxos/client/services';
import {
  DX_CONFIG,
  DX_DATA,
  DX_RUNTIME,
  ENV_DX_CONFIG,
  ENV_DX_NO_AGENT,
  ENV_DX_PROFILE,
  ENV_DX_PROFILE_DEFAULT,
  getProfilePath,
} from '@dxos/client-protocol';
import { type ConfigProto, Remote } from '@dxos/config';
import { raise } from '@dxos/debug';
import { type S } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { createFileProcessor, log, LogLevel, parseFilter } from '@dxos/log';
import {
  getObservabilityState,
  initializeNodeObservability,
  type Observability,
  showObservabilityBanner,
} from '@dxos/observability';
import { SpaceState } from '@dxos/protocols/proto/dxos/client/services';

import { ClientInitializationError, FriendlyError, PublisherConnectionError } from './errors';
import { matchKeys, PublisherRpcPeer, selectSpace, SupervisorRpcPeer, TunnelRpcPeer, waitForSpace } from './util';

const STDIN_TIMEOUT = 100;

const DEFAULT_CONFIG = 'config/config-default.yml';

// TODO(wittjosiah): Factor out.
const exists = async (...args: string[]): Promise<boolean> => {
  try {
    const result = await stat(join(...args));
    return !!result;
  } catch (err: any) {
    if (/ENOENT/.test(err.message)) {
      return false;
    } else {
      throw err;
    }
  }
};

export type Flags<T extends typeof Command> = Interfaces.InferredFlags<(typeof BaseCommand)['baseFlags'] & T['flags']>;
export type Args<T extends typeof Command> = Interfaces.InferredArgs<T['args']>;

//
// Common flags.
//

/**
 * @deprecated Change to flag.
 */
export const ARG_SPACE_KEYS = { key: Args.string({ description: 'Space key(s) head in hex.' }) };
// TODO(burdon): Change to --space?
export const FLAG_SPACE_KEYS = { key: Flags.string({ multiple: true, description: 'Space key(s) head in hex.' }) };

/**
 * Custom base command.
 * https://oclif.io/docs/base_class#docsNav
 * https://github.com/salesforcecli/sf-plugins-core/blob/main/src/sfCommand.ts
 */
export abstract class BaseCommand<T extends typeof Command = any> extends Command {
  public static override enableJsonFlag = true;

  static override flags = {
    // Even though oclif should support this out of the box there seems to be a bug.
    json: Flags.boolean({
      description: 'Output as JSON.',
      default: false,
    }),

    'dry-run': Flags.boolean({
      description: 'Dry run.',
      default: false,
    }),

    verbose: Flags.boolean({
      char: 'v',
      description: 'Verbose output',
      default: false,
    }),

    profile: Flags.string({
      description: 'User profile.',
      default: ENV_DX_PROFILE_DEFAULT,
      env: ENV_DX_PROFILE,
    }),

    config: Flags.string({
      env: ENV_DX_CONFIG,
      description: 'Config file.',
      helpValue: 'path',
      async default({ flags }: { flags: any }) {
        const profile = flags?.profile ?? ENV_DX_PROFILE_DEFAULT;
        return getProfilePath(DX_CONFIG, profile) + '.yml';
      },
      dependsOn: ['profile'],
      aliases: ['c'],
    }),

    timeout: Flags.integer({
      description: 'Timeout (ms).',
      default: 60_000,
      aliases: ['t'],
    }),

    target: Flags.string({
      description: 'Target websocket server.',
    }),

    agent: Flags.boolean({
      description: 'Run command with agent.',
      default: true,
      allowNo: true,
      env: ENV_DX_NO_AGENT,
    }),

    wait: Flags.boolean({
      description: 'Wait for space to be ready.',
      allowNo: true,
      default: false,
    }),

    // For consumption by Docker/Kubernetes/other log collection agents, write JSON logs to stderr.
    // Use stdout for user-facing interaction, and potentially JSON formatted output.
    // TODO(burdon): unify output/logging with oclif.
    'json-log': Flags.boolean({
      description: 'When running in foreground, log JSON format',
    }),

    'json-logfile': Flags.string({
      description: "JSON log file destination, or 'stdout' or 'stderr'",
      default: 'stderr',
    }),
  };

  private _clientConfig?: Config;
  private _client?: Client;
  private _failing = false;

  protected _startTime: Date;
  protected _observability?: Observability;

  protected flags!: Flags<T>;
  protected args!: Args<T>;

  constructor(argv: string[], config: OclifConfig) {
    super(argv, config);

    this._startTime = new Date();
  }

  get clientConfig() {
    invariant(this._clientConfig);
    return this._clientConfig!;
  }

  get duration() {
    return Date.now() - this._startTime.getTime();
  }

  done() {
    this.log('ok');
  }

  /**
   * Load the client config.
   */
  override async init(): Promise<void> {
    await super.init();
    const { args, flags } = await this.parse({
      flags: this.ctor.flags,
      baseFlags: (super.ctor as typeof BaseCommand).baseFlags,
      args: this.ctor.args,
      strict: this.ctor.strict,
    });

    this.flags = flags as Flags<T>;
    this.args = args as Args<T>;

    if (this.flags['json-log']) {
      let pathOrFd: number | string;
      switch (this.flags['json-logfile']) {
        case '-':
        case 'stdout':
          pathOrFd = process.stdout.fd;
          break;
        case 'stderr':
          pathOrFd = process.stderr.fd;
          break;
        default:
          pathOrFd = this.flags['json-logfile'];
      }
      log.addProcessor(
        createFileProcessor({
          pathOrFd,
          // avoid collision with log's getConfig usage of LOG_FILTER for CONSOLE_LOGGER
          levels: process.env.JSON_LOG_FILTER ? [] : [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO],
          filters: process.env.JSON_LOG_FILTER ? parseFilter(process.env.JSON_LOG_FILTER) : [],
        }),
      );
      // TODO(nf): disable console log completely?
      log.config({ filter: LogLevel.ERROR });
    } else {
      // Set config if not overridden by env.
      // TODO(nf): how to avoid abusive or unintentional spamming of Sentry?
      log.config({ filter: !process.env.LOG_FILTER && !process.env.LOG_CONFIG ? LogLevel.ERROR : undefined });
    }

    if (this.flags.target) {
      this.log('Using remote target:', this.flags.target);
      await this._loadConfigFromFile(Remote(this.flags.target, process.env.DX_AGENT_WS_AUTHENTICATION_TOKEN));
    } else {
      // Load user config file.
      await this._loadConfigFromFile();
    }

    await this._initObservability(
      this.flags['json-log'] && this.flags['json-logfile'] === 'stderr'
        ? (input) => process.stderr.write(JSON.stringify({ input }) + '\n')
        : undefined,
    );
  }

  async readStdin(): Promise<string> {
    return new Promise<string>((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: process.stdin.isTTY,
      });

      const inputLines: string[] = [];
      rl.on('line', (line) => inputLines.push(line));
      rl.on('close', () => resolve(inputLines.join('\n')));
      setTimeout(() => rl.close(), STDIN_TIMEOUT);
    });
  }

  private async _initObservability(
    logCb: (input: string) => void = (input: string) => process.stderr.write(chalk`{bold {magenta ${input} }}`),
  ) {
    const observabilityState = await getObservabilityState(DX_DATA);
    const { mode, installationId, group } = observabilityState;
    if (mode === 'disabled') {
      this.log('observability disabled by config');
      return;
    }

    if (group === 'dxos') {
      this.log(chalk`✨ {bgMagenta Running as internal user} ✨\n`);
    }

    await showObservabilityBanner(DX_DATA, (input: string) => {
      // Use callback to enable avoid interfering with JSON output (--json flag) and JSON log output on stderr (--json-log).
      logCb(input);
    });

    // TODO(nf): handle cases where the cli starts the agent for the user
    let namespace = 'cli';
    if (this.id === 'agent:start') {
      namespace = 'agent';
    }

    this._observability = await initializeNodeObservability({
      namespace,
      version: this.config.version,
      installationId,
      group,
      config: this._clientConfig!,
      mode,
      tracingEnable: true,
      replayEnable: true,
    });

    invariant(this.id);
    this._observability.setTag('command', this.id, 'telemetry');
  }

  /**
   * Load or create config file from defaults.
   * @private
   */
  private async _loadConfigFromFile(...additionalConfig: ConfigProto[]) {
    const { config: configFile } = this.flags;
    const configExists = await exists(configFile);
    if (!configExists) {
      const defaultConfigPath = join(
        dirname(pkgUp.sync({ cwd: __dirname }) ?? raise(new Error('Could not find package.json'))),
        DEFAULT_CONFIG,
      );

      const yamlConfig = yaml.load(await readFile(defaultConfigPath, 'utf-8')) as ConfigProto;
      {
        // Isolate DX_PROFILE storages.
        yamlConfig.runtime ??= {};
        yamlConfig.runtime.client ??= {};
        yamlConfig.runtime.client.storage ??= {};
        yamlConfig.runtime.client.storage.dataRoot = getProfilePath(
          yamlConfig.runtime.client.storage.dataRoot ?? DX_DATA,
          this.flags.profile,
        );
      }

      await mkdir(dirname(configFile), { recursive: true });
      await writeFile(configFile, yaml.dump(yamlConfig), 'utf-8');
    }

    // TODO(burdon): Use Profile()?
    this._clientConfig = new Config(yaml.load(await readFile(configFile, 'utf-8')) as ConfigProto, ...additionalConfig);
  }

  // TODO(burdon): Reconcile internal/external logging.

  /**
   * Use this method for user-facing messages.
   * Use @dxos/logger for internal messages.
   */
  override log(message: string, ...args: any[]) {
    super.log(message, ...args);
  }

  /**
   * Use this method for user-facing warnings.
   * Use @dxos/logger for internal messages.
   */
  override warn(err: string | Error) {
    const message = typeof err === 'string' ? err : err.message;
    super.logToStderr(chalk`{red Warning}: ${message}`);
    // NOTE: Default method displays stack trace.
    // super.warn(err);
    return err;
  }

  /**
   * Use this method for user-facing errors.
   * Use @dxos/logger for internal messages.
   * NOTE: Full stack trace is displayed if `oclif.settings.debug = true` (see bin script).
   * https://oclif.io/docs/error_handling
   */
  override catch(err: string | Error, options?: any): never;
  override catch(err: string | Error, options?: any): void {
    // Will only submit if API key exists (i.e., prod).
    this._observability?.captureException(err);

    this._failing = true;

    if (!this.flags || this.flags?.verbose) {
      // NOTE: Default method displays stack trace. And exits the process.
      super.error(err, options as any);
      return;
    }

    // Convert known errors to human readable messages.
    if (err instanceof FriendlyError) {
      this.logToStderr(chalk`{red Error}: ${err.message}`);
      err.hint && this.logToStderr(chalk`{gray HINT: ${err.hint}}`);
    } else {
      this.logToStderr(chalk`{red Error}: Something went wrong. Use --verbose for more details.`);
    }

    this.exit(1);
  }

  /**
   * Called after each command run.
   */
  override async finally() {
    const endTime = new Date();
    // TODO(nf): move to observability
    const installationId = this._observability?.getTag('installationId');
    const userId = this._observability?.getTag('identityKey');
    if (this._observability) {
      this._observability?.event({
        installationId: installationId?.value,
        identityId: userId?.value,
        name: 'cli.command.run',
        properties: {
          status: this._failing ? 'failure' : 'success',
          duration: endTime.getTime() - this._startTime.getTime(),
        },
      });
      await this._observability.close();
    }
    if (process.env.DX_TRACK_LEAKS) {
      (global as any).dxDumpLeaks?.();
      (globalThis as any).wtf.dump();
    }

    const stopFailsafe = setTimeout(() => {
      // TODO: log filter not correctly applied for this
      if (settings.debug) {
        this.log('timeout waiting for all promises to resolve, forcing exit');
      }

      // This is not a condition worth exiting as a failure for.
      process.exit(0);
    }, 1_000);
    stopFailsafe.unref();
  }

  async maybeStartDaemon() {
    if (this.flags.agent) {
      await this.execWithDaemon(async (daemon) => {
        const running = await daemon.isRunning(this.flags.profile);
        if (!running) {
          this.log(`Starting agent (${this.flags.profile})`);
          await daemon.start(this.flags.profile, { config: this.flags.config });
        }
      }, false);
    }
  }

  /**
   * Lazily create the client.
   */
  async getClient() {
    invariant(this._clientConfig);
    if (!this._client) {
      try {
        if (this.flags.agent) {
          // Connect to a locally-running agent, possibly starting one if necessary.
          await this.maybeStartDaemon();
          this._client = new Client({
            config: this._clientConfig,
            services: fromAgent({ profile: this.flags.profile }),
          });
        } else {
          // Create a client using a LocalClientServices "host mode" or by connecting to a remote ClientServices.
          this._client = new Client({ config: this._clientConfig });
        }

        await this._client.initialize();
      } catch (err: any) {
        // TODO(burdon): Hack.
        if (err.message.includes('401')) {
          throw new ClientInitializationError('error authenticating with remote service', err);
        }

        throw new ClientInitializationError('error initializing client', err);
      }
    }

    return this._client;
  }

  /**
   * Get spaces and optionally wait until ready.
   */
  async getSpaces(
    client: Client,
    {
      spaceKeys,
      includeHalo = false,
      wait = this.flags.wait,
    }: { spaceKeys?: string[]; includeHalo?: boolean; wait?: boolean } = {},
  ): Promise<Space[]> {
    await client.spaces.isReady.wait();
    const spaces = client.spaces
      .get()
      .filter(
        (space) =>
          (includeHalo || space !== client.spaces.default) && (!spaceKeys?.length || matchKeys(space.key, spaceKeys)),
      );

    if (wait) {
      await Promise.all(
        spaces.map(async (space) => {
          if (space.state.get() === SpaceState.INITIALIZING) {
            await waitForSpace(space, this.flags.timeout, (err) => this.catch(err));
          }
        }),
      );
    }

    return spaces;
  }

  /**
   * Get or select space.
   */
  async getSpace(client: Client, key?: string, wait = this.flags.wait): Promise<Space> {
    await client.spaces.isReady.wait();
    const spaces = await this.getSpaces(client, { wait });
    if (!key) {
      if (spaces.length === 1) {
        key = spaces[0].key.toHex();
      } else {
        key = await selectSpace(spaces);
      }
    }

    const space = spaces.find((space) => space.key.toHex().startsWith(key!));
    if (!space) {
      this.catch(`Invalid key: ${key}`);
    } else {
      if (wait && space.state.get() === SpaceState.INITIALIZING) {
        await waitForSpace(space, this.flags.timeout, (err) => this.catch(err));
      }

      return space;
    }
  }

  /**
   * Execute callback with the given space(s).
   */
  // TODO(burdon): Convert most commands to work with this.
  async execWithSpace<T>(
    callback: (props: { client: Client; space: Space }) => Promise<T | undefined>,
    options: { spaceKeys?: string[]; all?: boolean; types?: S.Schema<any>[]; verbose?: boolean } = {},
  ): Promise<T[] | undefined> {
    const client = await this.getClient();
    await this.onClientInit(client);

    const spaces =
      options.spaceKeys?.length || options.all
        ? await this.getSpaces(client, { spaceKeys: options.spaceKeys })
        : [await this.getSpace(client)];

    const values: T[] = [];
    for (const space of spaces) {
      if (options.verbose) {
        this.log(`Space: ${space.key.truncate()}`);
      }

      // TODO(burdon): Factor out.
      if (options.types) {
        for (const type of options.types) {
          if (!space.db.graph.runtimeSchemaRegistry.hasSchema(type)) {
            space.db.graph.runtimeSchemaRegistry.registerSchema(type as any);
          }
        }
      }

      const value = await callback({ client, space });
      await space.db.flush();
      if (value) {
        values.push(value);
      }
    }

    await client.destroy();
    return values;
  }

  /**
   * Convenience function to wrap command passing in client object.
   */
  async execWithClient<T>(
    callback: (client: Client) => Promise<T | undefined>,
    options: { halo?: boolean } = {},
  ): Promise<T | undefined> {
    const client = await this.getClient();

    if (options.halo && !client.halo.identity.get()) {
      this.warn('HALO not initialized; run `dx halo create --help`');
      process.exit(1);
    }

    await this.onClientInit(client);

    const value = await callback(client);
    await client.destroy();
    return value;
  }

  /**
   * Hook for client initialization.
   */
  protected async onClientInit(client: Client) {}

  /**
   * Convenience function to wrap starting the agent.
   */
  async execWithDaemon<T>(
    callback: (daemon: Daemon) => Promise<T | undefined>,
    system: boolean,
  ): Promise<T | undefined> {
    const platform = os.platform();
    const daemon = system
      ? new SystemDaemon(
          DX_RUNTIME,
          platform === 'darwin'
            ? new LaunchctlRunner()
            : platform === 'linux'
              ? new SystemctlRunner()
              : raise(new Error(`System daemon not implemented for ${os.platform()}.`)),
        )
      : new PhoenixDaemon(DX_RUNTIME);

    await daemon.connect();
    const value = await callback(daemon);
    await daemon.disconnect();
    return value;
  }

  /**
   * Convenience function to wrap command passing in KUBE publisher.
   */
  async execWithPublisher<T>(callback: (rpc: PublisherRpcPeer) => Promise<T | undefined>): Promise<T | undefined> {
    let rpc: PublisherRpcPeer | undefined;
    try {
      invariant(this._clientConfig);
      const wsEndpoint = this._clientConfig.get('runtime.services.publisher.server');
      invariant(wsEndpoint);
      rpc = new PublisherRpcPeer(wsEndpoint);
      await Promise.race([rpc.connected.waitForCount(1), rpc.error.waitForCount(1).then((err) => Promise.reject(err))]);
      return await callback(rpc);
    } catch (err: any) {
      this.log('Publisher failed: ', err);
      this.catch(new PublisherConnectionError());
    } finally {
      if (rpc) {
        await rpc.close();
      }
    }
  }

  async execWithTunneling<T>(callback: (rpc: TunnelRpcPeer) => Promise<T | undefined>): Promise<T | undefined> {
    let rpc: TunnelRpcPeer | undefined;
    try {
      invariant(this._clientConfig);
      const wsEndpoint = this._clientConfig.get('runtime.services.tunneling.server');
      invariant(wsEndpoint);
      rpc = new TunnelRpcPeer(wsEndpoint);
      await Promise.race([rpc.connected.waitForCount(1), rpc.error.waitForCount(1).then((err) => Promise.reject(err))]);
      return await callback(rpc);
    } catch (err: any) {
      this.catch(err);
    } finally {
      if (rpc) {
        await rpc.close();
      }
    }
  }

  async execWithSupervisor<T>(callback: (rpc: SupervisorRpcPeer) => Promise<T | undefined>): Promise<T | undefined> {
    let rpc: SupervisorRpcPeer | undefined;
    try {
      invariant(this._clientConfig);
      const wsEndpoint = this._clientConfig.get('runtime.services.supervisor.server');
      invariant(wsEndpoint);
      rpc = new SupervisorRpcPeer(wsEndpoint);
      await Promise.race([rpc.connected.waitForCount(1), rpc.error.waitForCount(1).then((err) => Promise.reject(err))]);
      return await callback(rpc);
    } catch (err: any) {
      this.catch(err);
    } finally {
      if (rpc) {
        await rpc.close();
      }
    }
  }

  parseJson<T>(filename: string): T {
    try {
      return JSON.parse(String(fs.readFileSync(filename))) as T;
    } catch (err) {
      log.error('error parsing file', { filename, err });
      throw err;
    }
  }
}
