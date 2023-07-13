//
// Copyright 2022 DXOS.org
//

import { Command, Config as OclifConfig, Flags, Interfaces } from '@oclif/core';
import chalk from 'chalk';
import yaml from 'js-yaml';
import fetch from 'node-fetch';
import assert from 'node:assert';
import fs from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import pkgUp from 'pkg-up';

import { Daemon, ForeverDaemon } from '@dxos/agent';
import { Client, fromAgent, Config, DX_DATA, DX_RUNTIME } from '@dxos/client';
import { DX_CONFIG, ENV_DX_CONFIG, ENV_DX_PROFILE, ENV_DX_PROFILE_DEFAULT } from '@dxos/client-protocol';
import { ConfigProto } from '@dxos/config';
import { raise } from '@dxos/debug';
import { log } from '@dxos/log';
import * as Sentry from '@dxos/sentry';
import { captureException } from '@dxos/sentry';
import * as Telemetry from '@dxos/telemetry';

import {
  IPDATA_API_KEY,
  SENTRY_DESTINATION,
  TELEMETRY_API_KEY,
  disableTelemetry,
  getTelemetryContext,
  PublisherRpcPeer,
  SupervisorRpcPeer,
  TelemetryContext,
  TunnelRpcPeer,
  showTelemetryBanner,
} from './util';

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
 * Ref: https://github.com/salesforcecli/sf-plugins-core/blob/main/src/sfCommand.ts
 */
export abstract class BaseCommand<T extends typeof Command = any> extends Command {
  private _clientConfig?: Config;
  private _client?: Client;
  protected _startTime: Date;
  private _failing = false;
  private readonly _stdin?: string;

  protected flags!: Flags<T>;
  protected args!: Args<T>;

  protected _telemetryContext?: TelemetryContext;

  public static override enableJsonFlag = true;

  static override flags = {
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
      async default({ flags }: { flags: any }) {
        const profile = flags?.profile ?? ENV_DX_PROFILE_DEFAULT;
        return join(DX_CONFIG, `profile/${profile}.yml`);
      },
      dependsOn: ['profile'],
      aliases: ['c'],
    }),

    // TODO(burdon): '--no-' prefix is not working.
    'no-agent': Flags.boolean({
      description: 'Auto-start agent.',
      default: false,
    }),

    timeout: Flags.integer({
      description: 'Timeout in seconds.',
      default: 30,
      aliases: ['t'],
    }),
  };

  constructor(argv: string[], config: OclifConfig) {
    super(argv, config);

    try {
      this._stdin = fs.readFileSync(0, 'utf8');
    } catch (err) {
      this._stdin = undefined;
    }

    this._startTime = new Date();
  }

  get clientConfig() {
    assert(this._clientConfig);
    return this._clientConfig!;
  }

  get stdin() {
    return this._stdin;
  }

  done() {
    log('ok');
  }

  /**
   * Load the client config.
   */
  override async init(): Promise<void> {
    await super.init();
    await this._initTelemetry();

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
  }

  private async _initTelemetry() {
    this._telemetryContext = await getTelemetryContext(DX_DATA);
    const { mode, installationId, group, environment, release } = this._telemetryContext;

    {
      if (group === 'dxos') {
        log(chalk`✨ {bgMagenta Running as internal user} ✨\n`);
      }

      await showTelemetryBanner(DX_DATA);
    }

    if (SENTRY_DESTINATION && mode !== 'disabled') {
      Sentry.init({
        installationId,
        destination: SENTRY_DESTINATION,
        environment,
        release,
        // TODO(wittjosiah): Configure this.
        sampleRate: 1.0,
        scrubFilenames: mode !== 'full',
        properties: {
          group,
        },
      });
    }

    if (TELEMETRY_API_KEY) {
      mode === 'disabled' && (await disableTelemetry(DX_DATA));

      Telemetry.init({
        apiKey: TELEMETRY_API_KEY,
        batchSize: 20,
        enable: Boolean(TELEMETRY_API_KEY) && mode !== 'disabled',
      });
    }

    this.addToTelemetryContext({ command: this.id });

    try {
      const res = await fetch(`https://api.ipdata.co/?api-key=${IPDATA_API_KEY}`);
      const data = await res.json();
      const { city, region, country, latitude, longitude } = data;
      this.addToTelemetryContext({ city, region, country, latitude, longitude });
    } catch (err) {
      captureException(err);
    }
  }

  private async _loadConfig() {
    const { config: configFile } = this.flags;
    const configExists = await exists(configFile);
    if (!configExists) {
      const defaultConfigPath = join(
        dirname(pkgUp.sync({ cwd: __dirname }) ?? raise(new Error('Could not find package.json'))),
        'config/config-default.yml',
      );

      const yamlConfig = yaml.load(await readFile(defaultConfigPath, 'utf-8')) as ConfigProto;
      {
        // Isolate DX_PROFILE storages.
        yamlConfig.runtime ??= {};
        yamlConfig.runtime.client ??= {};
        yamlConfig.runtime.client.storage ??= {};
        yamlConfig.runtime.client.storage.path = join(
          yamlConfig.runtime.client.storage.path ?? DX_DATA,
          this.flags.profile,
        );
      }

      await mkdir(dirname(configFile), { recursive: true });
      await writeFile(configFile, yaml.dump(yamlConfig), 'utf-8');
    }

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
    super.error(err, options as any);
    Sentry.captureException(err);
    this._failing = true;
  }

  /**
   * Called after each command run.
   */
  override async finally() {
    const endTime = new Date();

    Telemetry.event({
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
          await daemon.start(this.flags.profile);
          this.log('Started');
        }
      });
    }
  }

  /**
   * Lazily create the client.
   */
  async getClient() {
    await this.maybeStartDaemon();
    assert(this._clientConfig);
    if (!this._client) {
      await this.maybeStartDaemon();
      assert(this._clientConfig);
      if (this.flags['no-agent']) {
        this._client = new Client({ config: this._clientConfig });
      } else {
        this._client = new Client({ config: this._clientConfig, services: fromAgent({ profile: this.flags.profile }) });
      }

      await this._client.initialize();
      log('Client initialized', { profile: this.flags.profile });
    }

    return this._client;
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
  async execWithDaemon<T>(callback: (daemon: Daemon) => Promise<T | undefined>): Promise<T | undefined> {
    const daemon = new ForeverDaemon(`${DX_RUNTIME}`);
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
      assert(this._clientConfig);
      const wsEndpoint = this._clientConfig.get('runtime.services.publisher.server');
      assert(wsEndpoint);
      rpc = new PublisherRpcPeer(wsEndpoint);
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

  async execWithTunneling<T>(callback: (rpc: TunnelRpcPeer) => Promise<T | undefined>): Promise<T | undefined> {
    let rpc: TunnelRpcPeer | undefined;
    try {
      assert(this._clientConfig);
      const wsEndpoint = this._clientConfig.get('runtime.services.tunneling.server');
      assert(wsEndpoint);
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
      assert(this._clientConfig);
      const wsEndpoint = this._clientConfig.get('runtime.services.supervisor.server');
      assert(wsEndpoint);
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
