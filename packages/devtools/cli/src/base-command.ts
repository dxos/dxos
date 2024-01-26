//
// Copyright 2022 DXOS.org
//

import { Command, type Config as OclifConfig, Flags, type Interfaces } from '@oclif/core';
import chalk from 'chalk';
import yaml from 'js-yaml';
import fetch from 'node-fetch';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import { dirname, join } from 'node:path';
import readline from 'node:readline';
import pkgUp from 'pkg-up';

import {
  AgentIsNotStartedByCLIError,
  AgentWaitTimeoutError,
  type Daemon,
  PhoenixDaemon,
  SystemDaemon,
  LaunchctlRunner,
  SystemctlRunner,
} from '@dxos/agent';
import { Client, Config } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { fromAgent } from '@dxos/client/services';
import {
  getProfilePath,
  DX_CONFIG,
  DX_DATA,
  DX_RUNTIME,
  ENV_DX_CONFIG,
  ENV_DX_PROFILE,
  ENV_DX_PROFILE_DEFAULT,
} from '@dxos/client-protocol';
import { type ConfigProto } from '@dxos/config';
import { raise } from '@dxos/debug';
import { invariant } from '@dxos/invariant';
import { log, LogLevel } from '@dxos/log';
import { Observability } from '@dxos/observability';
import { SpaceState } from '@dxos/protocols/proto/dxos/client/services';

import { IdentityWaitTimeoutError, PublisherConnectionError, SpaceWaitTimeoutError } from './errors';
import {
  getTelemetryContext,
  showTelemetryBanner,
  PublisherRpcPeer,
  SupervisorRpcPeer,
  type TelemetryContext,
  TunnelRpcPeer,
  selectSpace,
  waitForSpace,
} from './util';

const STDIN_TIMEOUT = 100;

// Set config if not overridden by env.
// TODO(nf): how to avoid abusive or unintentional spamming of Sentry?
log.config({ filter: !process.env.LOG_FILTER && !process.env.LOG_CONFIG ? LogLevel.ERROR : undefined });

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

    // TODO(burdon): '--no-' prefix is not working.
    'no-agent': Flags.boolean({
      description: 'Run command without using or starting agent.',
      default: false,
    }),

    timeout: Flags.integer({
      description: 'Timeout (ms).',
      default: 60_000,
      aliases: ['t'],
    }),

    'no-wait': Flags.boolean({
      description: 'Do not wait for space to be ready.',
    }),
  };

  private _clientConfig?: Config;
  private _client?: Client;
  protected _startTime: Date;
  private _failing = false;

  protected _telemetryContext?: TelemetryContext;
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

    // Load user config file.
    await this._loadConfig();
    await this._initObservability();
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

  private async _initObservability() {
    this._telemetryContext = await getTelemetryContext(DX_DATA);
    const { mode, installationId, group } = this._telemetryContext;

    if (mode === 'disabled') {
      this.log('telemetry disabled by config');
      return;
    }
    {
      if (group === 'dxos') {
        this.log(chalk`✨ {bgMagenta Running as internal user} ✨\n`);
      }

      await showTelemetryBanner(DX_DATA);
    }

    // TODO(nf): handle cases where the cli starts the agent for the user
    let namespace = 'cli';
    if (this.id === 'agent:start') {
      namespace = 'agent';
    }
    const release = `${namespace}@${this.clientConfig.get('runtime.app.build.version')}`;
    const environment = this.clientConfig.get('runtime.app.env.DX_ENVIRONMENT');

    this._observability = new Observability({
      namespace,
      group,
      mode,
      errorLog: {
        sentryInitOptions: {
          installationId,
          environment,
          release,
          // TODO(wittjosiah): Configure this.
          sampleRate: 1.0,
        },
      },
      logProcessor: true,
    });

    this._observability.initialize();

    this.addToTelemetryContext({ command: this.id });

    // TODO(nf): move to observability
    const IPDATA_API_KEY = this.clientConfig.get('runtime.app.env.DX_IPDATA_API_KEY');
    try {
      const res = await fetch(`https://api.ipdata.co/?api-key=${IPDATA_API_KEY}`);
      const data = await res.json();
      const { city, region, country, latitude, longitude } = data;
      this.addToTelemetryContext({ city, region, country, latitude, longitude });
    } catch (err) {
      this._observability?.captureException(err);
    }
  }

  /**
   * Load or create config file from defaults.
   * @private
   */
  private async _loadConfig() {
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
    this._clientConfig = new Config(yaml.load(await readFile(configFile, 'utf-8')) as ConfigProto);
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
  override error(err: string | Error, options?: any): never;
  override error(err: string | Error, options?: any): void {
    // Will only submit if API key exists (i.e., prod).
    this._observability?.captureException(err);

    this._failing = true;

    if (this.flags.verbose) {
      // NOTE: Default method displays stack trace. And exits the process.
      super.error(err, options as any);
      return;
    }

    // TODO(burdon): Errors should not be imported (polluting base command); just stringify.
    // Convert known errors to human readable messages.
    if (err instanceof SpaceWaitTimeoutError) {
      this.logToStderr(chalk`{red Error}: ${err.message}`);
    } else if (err instanceof AgentWaitTimeoutError) {
      // TODO(burdon): Need better diagnostics: might fail for other reasons.
      this.logToStderr(chalk`{red Error}: Agent may be stale (to restart: 'dx agent restart --force')`);
    } else if (err instanceof AgentIsNotStartedByCLIError) {
      this.logToStderr(chalk`{red Error}: Agent may be running in the foreground or as a system daemon.`);
    } else if (err instanceof PublisherConnectionError) {
      this.logToStderr(chalk`{red Error}: Could not connect to publisher.`);
    } else if (err instanceof IdentityWaitTimeoutError) {
      this.logToStderr(chalk`{red Error}: Identity not initialized.`);
    } else {
      // Handle unknown errors with default method.
      super.error(err, options as any);
      return;
    }

    this.exit();
  }

  /**
   * Called after each command run.
   */
  override async finally() {
    const endTime = new Date();
    this._observability?.event({
      installationId: this._telemetryContext?.installationId,
      name: 'cli.command.run',
      properties: {
        ...this._telemetryContext,
        status: this._failing ? 'failure' : 'success',
        duration: endTime.getTime() - this._startTime.getTime(),
      },
    });
  }

  async maybeStartDaemon() {
    if (!this.flags['no-agent']) {
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
      if (this.flags['no-agent']) {
        this._client = new Client({ config: this._clientConfig });
      } else {
        await this.maybeStartDaemon();
        this._client = new Client({ config: this._clientConfig, services: fromAgent({ profile: this.flags.profile }) });
      }

      await this._client.initialize();
      log('Client initialized', { profile: this.flags.profile });
    }

    return this._client;
  }

  /**
   * Get spaces and optionally wait until ready.
   */
  async getSpaces(client: Client, wait = true): Promise<Space[]> {
    const spaces = client.spaces.get();
    if (wait && !this.flags['no-wait']) {
      await Promise.all(
        spaces.map(async (space) => {
          if (space.state.get() === SpaceState.INITIALIZING) {
            await waitForSpace(space, this.flags.timeout, (err) => this.error(err));
          }
        }),
      );
    }

    return spaces;
  }

  /**
   * Get or select space.
   */
  async getSpace(client: Client, key?: string, wait = true): Promise<Space> {
    const spaces = await this.getSpaces(client, wait);
    if (!key) {
      key = await selectSpace(spaces);
    }

    const space = spaces.find((space) => space.key.toHex().startsWith(key!));
    if (!space) {
      this.error(`Invalid key: ${key}`);
    } else {
      if (wait && !this.flags['no-wait'] && space.state.get() === SpaceState.INITIALIZING) {
        await waitForSpace(space, this.flags.timeout, (err) => this.error(err));
      }

      return space;
    }
  }

  /**
   * Convenience function to wrap command passing in client object.
   */
  async execWithClient<T>(
    callback: (client: Client) => Promise<T | undefined>,
    checkHalo = false,
  ): Promise<T | undefined> {
    const client = await this.getClient();
    if (checkHalo && !client.halo.identity.get()) {
      this.warn('HALO not initialized; run `dx halo create --help`');
      process.exit(1);
    }

    const value = await callback(client);
    await client.destroy();
    return value;
  }

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
      this.error(new PublisherConnectionError());
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
      this.error(err);
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
      this.error(err);
    } finally {
      if (rpc) {
        await rpc.close();
      }
    }
  }

  addToTelemetryContext(values: object) {
    if (!this._telemetryContext) {
      return;
    }

    this._telemetryContext = {
      ...this._telemetryContext,
      ...values,
    };
  }
}
