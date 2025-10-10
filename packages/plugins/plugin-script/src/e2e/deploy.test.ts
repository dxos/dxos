//
// Copyright 2025 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Client, Config } from '@dxos/client';
import { createEdgeIdentity } from '@dxos/client/edge';
import { Obj, Ref } from '@dxos/echo';
import { FunctionType, ScriptType } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { DataType } from '@dxos/schema';

import { templates } from '../templates';
import { deployScript } from '../util/deploy';

describe('Deployed Functions', () => {
  test('deploys function and invokes it via EDGE', { timeout: 120_000 }, async () => {
    const config = new Config({
      version: 1,
      runtime: {
        services: {
          edge: { url: 'https://edge-main.dxos.workers.dev' },
        },
      },
    });

    const client = new Client({ config });
    client.addTypes([FunctionType, ScriptType, DataType.Text]);
    await client.initialize();
    await client.halo.createIdentity();

    const space = await client.spaces.create();
    await space.waitUntilReady();

    // Load the echo template source.
    const template = templates.find((t) => t.id === 'dxos.org/script/echo');
    invariant(template?.source, 'scriptSource is required');
    const source = Obj.make(DataType.Text, { content: template.source });
    const script = Obj.make(ScriptType, { name: 'e2e-echo', changed: true, source: Ref.make(source) });
    space.db.add(source);
    space.db.add(script);
    await space.db.flush();

    const { success, functionId, error } = await deployScript({ script, client, space });
    expect(success, error?.message).toBe(true);
    expect(functionId).toBeDefined();

    // Invoke deployed function via EDGE directly.
    const edgeClient = client.edge;
    invariant(edgeClient, 'edgeClient is required');
    edgeClient.setIdentity(createEdgeIdentity(client));

    // functionId may include a leading '/', strip it for invoke endpoint.
    const cleanedId = (functionId ?? '').replace(/^\//, '');
    const input = { msg: 'hello' };
    const result = await edgeClient.invokeFunction({ functionId: cleanedId }, input);
    log.info('>>> result', { result });
    expect(result).toEqual({ success: true, data: { msg: 'hello' } });

    await client.destroy();
  });
});
