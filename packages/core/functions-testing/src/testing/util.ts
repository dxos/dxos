//
// Copyright 2025 DXOS.org
//

import fs from 'node:fs';

import { sleep } from '@dxos/async';
import { Client, type Config } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { Filter, Obj, Query } from '@dxos/echo';
import { Function } from '@dxos/functions';
import { Trigger } from '@dxos/functions';
import { InvocationTraceEndEvent, InvocationTraceStartEvent } from '@dxos/functions-runtime';
import { FunctionsServiceClient } from '@dxos/functions-runtime/edge';
import { bundleFunction } from '@dxos/functions-runtime/native';
import type { BundleResult } from '@dxos/functions-runtime/native';
import { Runtime } from '@dxos/protocols';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';

export const writeBundle = (path: string, bundle: BundleResult) => {
  fs.mkdirSync(path, { recursive: true });
  Object.entries(bundle.assets).forEach(([name, content]) => {
    fs.writeFileSync(path + '/' + name, content);
  });
};

export const setup = async (config: Config) => {
  const client = await new Client({
    config,
    types: [Function.Function, Trigger.Trigger],
  }).initialize();
  await client.halo.createIdentity();

  const space = await client.spaces.create();
  await space.waitUntilReady();
  await space.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED);

  const functionsServiceClient = FunctionsServiceClient.fromClient(client);

  return { client, space, functionsServiceClient };
};

export const sync = async (space: Space) => {
  await space.db.flush({ indexes: true });
  await space.internal.syncToEdge({
    onProgress: (state) =>
      console.log(state ? `${state.unsyncedDocumentCount} documents syncing...` : 'connecting to edge...'),
  });
};

export const deployFunction = async (
  space: Space,
  functionsServiceClient: FunctionsServiceClient,
  entryPoint: string,
  runtime: Runtime,
) => {
  const artifact = await bundleFunction({
    entryPoint,
    verbose: true,
  });
  const func = await functionsServiceClient.deploy({
    version: '0.0.1',
    ownerPublicKey: space.key,
    entryPoint: artifact.entryPoint,
    assets: artifact.assets,
    runtime,
  });
  space.db.add(func);

  return func;
};

export const observeInvocations = async (space: Space, count: number | null) => {
  let initialCount = null;
  const invocationData = new Map<
    string,
    {
      begin: InvocationTraceStartEvent;
      end?: InvocationTraceEndEvent;
    }
  >();
  while (true) {
    try {
      const invocations =
        (await space.properties.invocationTraceQueue?.target!.query(Query.select(Filter.everything())).run()) ?? [];

      for (const invocation of invocations) {
        if (Obj.instanceOf(InvocationTraceStartEvent, invocation)) {
          if (invocationData.has(invocation.invocationId)) {
            continue;
          }
          invocationData.set(invocation.invocationId, {
            begin: invocation,
          });
          console.log(`BEGIN ${JSON.stringify(invocation.input)}`);
        } else if (Obj.instanceOf(InvocationTraceEndEvent, invocation)) {
          const data = invocationData.get(invocation.invocationId);
          if (!data || !!data.end) {
            continue;
          }
          data.end = invocation;

          const outcome = data.end.outcome;
          console.log(`END outcome=${outcome} duration=${data.end.timestamp - data.begin.timestamp}`);
          if (outcome === 'failure') {
            console.log(data.end.exception?.stack);
          }
        }
      }
      if (initialCount === null) {
        initialCount = invocations.length;
      }

      if (count !== null && invocationData.size >= count + initialCount) {
        break;
      }
    } catch (err) {
      console.error(err);
    }
    await sleep(1_000);
  }
};
