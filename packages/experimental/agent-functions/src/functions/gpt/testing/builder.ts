//
// Copyright 2023 DXOS.org
//

import { Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { TestBuilder } from '@dxos/client/testing';
import { Context } from '@dxos/context';
import { createSpaceObjectGenerator } from '@dxos/echo-generator';
import { invariant } from '@dxos/invariant';

import { type ChainResources, type ChainVariant, createChainResources } from '../../../chain';
import { getConfig, getKey, registerTypes } from '../../../util';

export class TestProcessorBuilder {
  private readonly _ctx = new Context();

  private _client?: Client;
  private _space?: Space;
  private _resources?: ChainResources;

  async init() {
    const builder = new TestBuilder();
    const config = getConfig()!;

    this._client = new Client({ config, services: builder.createLocalClientServices() });
    await this._client.initialize();
    await this._client.halo.createIdentity();

    this._space = await this._client.spaces.create();
    registerTypes(this._space);

    this._resources = createChainResources((process.env.DX_AI_MODEL as ChainVariant) ?? 'openai', {
      baseDir: '/tmp/dxos/testing/agent/functions/embedding',
      apiKey: getKey(this._client.config, 'openai.com/api_key'),
    });

    this._ctx.onDispose(async () => {
      await this._client?.destroy();
      this._client = undefined;
    });

    return this;
  }

  async destroy() {
    await this._ctx.dispose();
  }

  get client(): Client {
    return this._client!;
  }

  get space(): Space {
    return this._space!;
  }

  get resources(): ChainResources {
    return this._resources!;
  }

  async addSchema() {
    invariant(this._space);
    const generator = createSpaceObjectGenerator(this._space);
    generator.addSchemas();
    await this._space.db.flush();
    return this;
  }
}
