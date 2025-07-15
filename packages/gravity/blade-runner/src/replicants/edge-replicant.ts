//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { asyncTimeout, sleep, Trigger, waitForCondition } from '@dxos/async';
import { Client, Config } from '@dxos/client';
import { DeviceType, type Identity } from '@dxos/client/halo';
import { type ConfigProto } from '@dxos/config';
import { Context } from '@dxos/context';
import { TypedObject } from '@dxos/echo-schema';
import { getInvocationUrl } from '@dxos/functions';
import { Bundler } from '@dxos/functions/bundler';
import { uploadWorkerFunction } from '@dxos/functions/edge';
import { invariant } from '@dxos/invariant';
import { type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { dataGenerator } from '@dxos/plugin-script/templates';
import { type IndexConfig } from '@dxos/protocols/proto/dxos/echo/indexing';
import { trace } from '@dxos/tracing';

import { type ReplicantEnv, ReplicantRegistry } from '../env';

export class Text extends TypedObject({ typename: 'dxos.org/blade-runner/Text', version: '0.1.0' })({
  content: Schema.String,
}) {}

@trace.resource()
export class EdgeReplicant {
  private _client?: Client = undefined;
  private _identity?: Identity = undefined;

  constructor(private readonly env: ReplicantEnv) {}

  @trace.span()
  async initClient({ config, indexing }: { config: ConfigProto; indexing?: IndexConfig }): Promise<void> {
    log.trace('dxos.edge-replicant.initClient');

    // Initialize client.
    this._client = new Client({ config: new Config(config) });
    await this._client.initialize();

    // Set indexing config.
    if (indexing) {
      await this._client.services.services.QueryService!.setConfig(indexing, { timeout: 20_000 });
    }
  }

  @trace.span()
  async destroyClient(): Promise<void> {
    log.trace('dxos.edge-replicant.destroyClient');
    await this._client?.destroy();
  }

  async createIdentity(): Promise<Identity> {
    invariant(this._client, 'no client');
    const identity = await this._client.halo.createIdentity();
    this._identity = identity;
    await this._client.spaces.waitUntilReady();
    return identity;
  }

  async startAgent(): Promise<void> {
    log.trace('dxos.edge-replicant.startAgent');
    invariant(this._client, 'no client');
    const agentKey = await this.getAgentKey();
    if (agentKey) {
      log.info('agent already created', { agentKey });
      return;
    }

    await this._client.services.services.EdgeAgentService!.createAgent(null as any, { timeout: 10_000 });
    log.info('agent created');
  }

  async getAgentKey(): Promise<string | undefined> {
    invariant(this._client, 'no client');
    const agentDevice = this._client.halo.devices
      .get()
      .find((device) => device.profile?.type === DeviceType.AGENT_MANAGED);
    return agentDevice?.deviceKey.toHex();
  }

  async createSpace(): Promise<SpaceId> {
    await sleep(1000);
    invariant(this._client, 'no client');
    const agentDevice = this._client.halo.devices
      .get()
      .find((device) => device.profile?.type === DeviceType.AGENT_MANAGED);
    const agentKey = agentDevice?.deviceKey.toHex();
    invariant(agentKey, 'no agent key');

    const response = await this._client!.edge.createSpace({ agentKey });
    log.info('space created', { response });
    const space = await waitForCondition({
      condition: () => this._client!.spaces.get(response.spaceId as SpaceId),
      timeout: 10000,
      interval: 100,
    });
    invariant(space, 'space not found');

    return space.id;
  }

  async deployFunction({ source }: { source?: string } = {}): Promise<{ functionId: string; version: string }> {
    const bundler = new Bundler({ platform: 'node', sandboxedModules: [], remoteModules: {} });
    const buildResult = await bundler.bundle({ source: source ?? dataGenerator });

    if (buildResult.error || !buildResult.bundle) {
      log.error('Bundle creation failed', { buildResult });
      throw new Error('Bundle creation failed');
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

  async waitForReplication({ spaceId }: { spaceId: SpaceId }) {
    invariant(this._client, 'no client');
    const space = this._client!.spaces.get(spaceId);
    invariant(space, 'space not found');

    const replicationIsDone = new Trigger();
    const unsub = space.crud.subscribeToSyncState(Context.default(), (state) => {
      log.info('sync state', { state });
      if (state.peers?.every((peer) => peer.differentDocuments === 0)) {
        replicationIsDone.wake();
      }
    });

    await replicationIsDone.wait({ timeout: 30_000 });
    unsub();
  }
}

ReplicantRegistry.instance.register(EdgeReplicant);
