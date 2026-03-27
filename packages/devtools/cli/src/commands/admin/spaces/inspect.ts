//
// Copyright 2025 DXOS.org
//

import * as Args from '@effect/cli/Args';
import * as Command from '@effect/cli/Command';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { CommandConfig } from '@dxos/cli-util';

import { adminRequest, formatAdminError } from '../util';

type SpaceDetail = {
  spaceId: string;
  metadata: { createdAt: string; identityKey?: string; status?: string } | null;
  members: {
    count: number;
    list: { identityKey: string; role?: string; agentKey?: string }[];
  };
  feeds: {
    count: number;
    totalBlocks: number;
    byNamespace: {
      namespace: string;
      feeds: { feedId: string; blockCount: number }[];
    }[];
    replicationProgress: Record<string, { replicated: number; processed: number }>;
  };
  echo: {
    documentCount: number;
    objectCount: number;
    objectsByType: { typeDxn: string; count: number }[];
    storageSizeBytes: number;
    indexerStatus: { indexingInProgress: boolean; indexedChanges: number; totalChanges: number };
  };
  usageInLast30Days: {
    lastActivity: string | null;
    wsEvents: number;
    httpEvents: number;
    totalEvents: number;
  } | null;
  durableObjects: { type: string; doId: string }[];
};

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const printSection = function* (title: string, lines: string[]) {
  yield* Console.log(`\n  ${title}`);
  for (const line of lines) {
    yield* Console.log(`    ${line}`);
  }
};

export const inspect = Command.make(
  'inspect',
  { spaceId: Args.text({ name: 'spaceId' }) },
  Effect.fn(function* ({ spaceId }) {
    const data = yield* adminRequest('GET', `/admin/spaces/${spaceId}`).pipe(
      Effect.catchAll((error) => Effect.fail(new Error(formatAdminError(error)))),
    );

    if (yield* CommandConfig.isJson) {
      yield* Console.log(JSON.stringify(data, null, 2));
    } else {
      const result = data as SpaceDetail;
      yield* Console.log(`Space: ${result.spaceId}`);

      if (result.metadata) {
        yield* Console.log(`  Status:   ${result.metadata.status ?? 'unknown'}`);
        yield* Console.log(`  Created:  ${result.metadata.createdAt}`);
        if (result.metadata.identityKey) {
          yield* Console.log(`  Identity: ${result.metadata.identityKey}`);
        }
      } else {
        yield* Console.log('  Metadata: not in registry');
      }

      yield* printSection(`Members (${result.members.count})`, result.members.list.map((member) => {
        const role = member.role ? ` [${member.role}]` : '';
        const agent = member.agentKey ? ` agent:${member.agentKey.slice(0, 12)}...` : '';
        return `${member.identityKey}${role}${agent}`;
      }));

      yield* printSection(`Feeds (${result.feeds.count}, ${result.feeds.totalBlocks} blocks)`, [
        ...result.feeds.byNamespace.flatMap((ns) => [
          `${ns.namespace}:`,
          ...ns.feeds.map((feed) => `  ${feed.feedId} (${feed.blockCount} blocks)`),
        ]),
      ]);

      const indexer = result.echo.indexerStatus;
      const indexerLabel = indexer.indexingInProgress
        ? `indexing ${indexer.indexedChanges}/${indexer.totalChanges}`
        : `idle (${indexer.indexedChanges}/${indexer.totalChanges})`;
      yield* printSection('Echo', [
        `Documents: ${result.echo.documentCount}`,
        `Objects:   ${result.echo.objectCount}`,
        `Storage:   ${formatBytes(result.echo.storageSizeBytes)}`,
        `Indexer:   ${indexerLabel}`,
        ...result.echo.objectsByType.slice(0, 10).map(
          (entry) => `  ${entry.typeDxn}: ${entry.count}`,
        ),
        ...(result.echo.objectsByType.length > 10
          ? [`  ... and ${result.echo.objectsByType.length - 10} more types`]
          : []),
      ]);

      if (result.usageInLast30Days) {
        const usage = result.usageInLast30Days;
        yield* printSection('Usage (last 30 days)', [
          `Last activity: ${usage.lastActivity ?? 'n/a'}`,
          `HTTP events:   ${usage.httpEvents}`,
          `WS events:     ${usage.wsEvents}`,
          `Total events:  ${usage.totalEvents}`,
        ]);
      }

      if (result.durableObjects.length > 0) {
        yield* printSection('Durable Objects', result.durableObjects.map(
          (dobj) => `${dobj.type}: ${dobj.doId}`,
        ));
      }
    }
  }),
).pipe(Command.withDescription('Inspect a space.'));
