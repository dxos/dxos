//
// Copyright 2025 DXOS.org
//

import fs from 'node:fs';

import { sleep } from '@dxos/async';
import { Client, type Config } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { Operation, Trace, Trigger } from '@dxos/compute';
import { Context } from '@dxos/context';
import { Query } from '@dxos/echo';
import { FeedTraceSink } from '@dxos/functions-runtime';
import { FunctionsServiceClient } from '@dxos/functions-runtime/edge';
import { bundleFunction } from '@dxos/functions-runtime/native';
import type { BundleResult } from '@dxos/functions-runtime/native';
import { type FunctionRuntimeKind } from '@dxos/protocols';
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
    types: [Operation.PersistentOperation, Trigger.Trigger],
  }).initialize();
  await client.halo.createIdentity();

  const space = await client.spaces.create();
  await space.waitUntilReady();
  await space.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED);

  const functionsServiceClient = FunctionsServiceClient.fromClient(client);

  return { client, space, functionsServiceClient };
};

export const sync = async (space: Space) => {
  await space.db.flush();
  await space.internal.syncToEdge({
    onProgress: (state) =>
      console.log(state ? `${state.unsyncedDocumentCount} documents syncing...` : 'connecting to edge...'),
  });
};

export const deployFunction = async (
  space: Space,
  functionsServiceClient: FunctionsServiceClient,
  entryPoint: string,
  runtime: FunctionRuntimeKind,
): Promise<Operation.PersistentOperation> => {
  const artifact = await bundleFunction({
    entryPoint,
    verbose: true,
  });
  const func = await functionsServiceClient.deploy(Context.default(), {
    version: '0.0.1',
    ownerPublicKey: space.key,
    entryPoint: artifact.entryPoint,
    assets: artifact.assets,
    runtime,
  });
  space.db.add(func);

  return func;
};

/**
 * Polls the per-space trace feed for new invocation events, printing them as they appear.
 * Resolves once `maxCount` new invocations have been observed (since the first poll).
 */
export const observeInvocations = async (space: Space, maxCount: number | null) => {
  let initialCount: number | null = null;
  const seen = new Map<string, { count: number; startTimestamp?: number; reportedEnd: boolean }>();
  let count = 0;
  while (true) {
    try {
      const feeds = await space.db.query(FeedTraceSink.query).run();
      const feed = feeds[0];
      const messages = feed ? await space.db.query(Query.type(Trace.Message).from(feed)).run() : [];

      for (const message of messages) {
        const pid = message.meta.pid;
        if (!pid) {
          continue;
        }
        for (const event of message.events) {
          if (Trace.isOfType(Trace.OperationStart, event)) {
            if (seen.has(pid)) {
              continue;
            }
            seen.set(pid, { count: count++, startTimestamp: event.timestamp, reportedEnd: false });
            console.log(
              `${count.toString().padStart(3, ' ')}: BEGIN ${event.data.runtime ?? '(unknown runtime)'} ${JSON.stringify(event.data.input)}`,
            );
          } else if (Trace.isOfType(Trace.OperationEnd, event)) {
            const entry = seen.get(pid);
            if (!entry || entry.reportedEnd) {
              continue;
            }
            entry.reportedEnd = true;
            const duration = entry.startTimestamp ? event.timestamp - entry.startTimestamp : undefined;
            console.log(
              `${entry.count.toString().padStart(3, ' ')}: END outcome=${event.data.outcome} duration=${duration ?? '?'}`,
            );
            if (event.data.outcome === 'failure' && event.data.error) {
              console.error(event.data.error);
            }
          }
        }
      }

      if (initialCount === null) {
        initialCount = seen.size;
      }

      if (maxCount !== null && seen.size >= maxCount + initialCount) {
        break;
      }
    } catch (err) {
      console.error(err);
    }
    await sleep(1_000);
  }
};
