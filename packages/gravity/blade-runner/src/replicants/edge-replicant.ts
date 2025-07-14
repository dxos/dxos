//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';
import fs from 'node:fs';
import path from 'node:path';

import { asyncTimeout } from '@dxos/async';
import { Client, Config } from '@dxos/client';
import { type Device, type Identity } from '@dxos/client/halo';
import { type ConfigProto } from '@dxos/config';
import { Context } from '@dxos/context';
import { TypedObject } from '@dxos/echo-schema';
import { getInvocationUrl } from '@dxos/functions';
import { Bundler } from '@dxos/functions/bundler';
import { uploadWorkerFunction } from '@dxos/functions/edge';
import { invariant } from '@dxos/invariant';
import { type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { trace } from '@dxos/tracing';

import { type ReplicantEnv, ReplicantRegistry } from '../env';

export class Text extends TypedObject({ typename: 'dxos.org/blade-runner/Text', version: '0.1.0' })({
  content: Schema.String,
}) {}

const SCRIPT_PATH = path.join(
  import.meta.dirname,
  '..',
  '..',
  '..',
  '..',
  'packages',
  'plugins',
  'plugin-script',
  'src',
  'templates',
  'data-generator.ts',
);

@trace.resource()
export class EdgeReplicant {
  private readonly _ctx = new Context();
  private _client?: Client = undefined;
  private _identity?: Identity = undefined;

  constructor(private readonly env: ReplicantEnv) {}

  @trace.span()
  async open({ config }: { config: ConfigProto }): Promise<void> {
    log.trace('dxos.edge-replicant.open');
    this._client = new Client({ config: new Config(config) });
    await this._client.initialize();
  }

  @trace.span()
  async close(): Promise<void> {
    log.trace('dxos.edge-replicant.close');
    await this._client?.destroy();
    void this._ctx.dispose();
  }

  async createIdentity(): Promise<Identity> {
    const identity = await this._client!.halo.createIdentity();
    this._identity = identity;
    return identity;
  }

  async createSpace(): Promise<SpaceId> {
    const space = await this._client!.spaces.create();
    return space.id;
  }

  async listDevices(): Promise<Device[]> {
    return this._client!.halo.devices.get();
  }

  async deployFunction({
    path,
  }: {
    path: string;
  }): Promise<{ functionId: string; version: string } | { error: string }> {
    const bundler = new Bundler({ platform: 'node', sandboxedModules: [], remoteModules: {} });
    const buildResult = await bundler.bundle({ source: fs.readFileSync(path ?? SCRIPT_PATH, 'utf8') });

    if (buildResult.error || !buildResult.bundle) {
      return { error: 'Bundle creation failed' };
    }

    const result = await asyncTimeout(
      uploadWorkerFunction({
        client: this._client!,
        ownerPublicKey: this._identity!.identityKey,
        version: '0.0.1',
        name: 'test',
        source: buildResult.bundle,
      }),
      10_000,
    );
    invariant(result.functionId, 'Upload failed.');
    log.info(`Uploaded function ${result.functionId}, version ${result.version}`);
    return result;
  }

  async invokeFunction({
    functionId,
    spaceId,
    input,
  }: {
    functionId: string;
    spaceId: SpaceId;
    input: string;
  }): Promise<any> {
    invariant(this._client?.config?.values.runtime?.services?.edge?.url, 'Edge URL not initialized');
    const url = getInvocationUrl(functionId, this._client.config.values.runtime.services.edge.url, { spaceId });
    const response = await fetch(url, {
      method: 'POST',
      body: input,
    });

    return response.text();
  }
}

ReplicantRegistry.instance.register(EdgeReplicant);
