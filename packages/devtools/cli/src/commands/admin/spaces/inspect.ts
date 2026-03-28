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
  controlFeeds: {
    replicationProgress: Record<string, { replicated: number; processed: number }>;
  };
  echo: {
    dataFeeds: {
      count: number;
      totalBlocks: number;
      byNamespace: {
        namespace: string;
        feeds: { feedId: string; blockCount: number }[];
      }[];
    };
    documentCount: number;
    objectCount: number;
    deletedObjectCount: number;
    indexedDocumentCount: number;
    objectsByType: { typeDxn: string; count: number }[];
    indexerStatus: {
      indexingInProgress: boolean;
      cursors: { indexName: string; sourceName: string; resourceId: string | null; cursor: string | number }[];
      totalChanges: number;
    };
  };
  usageInLast30Days: {
    lastActivity: string | null;
    wsEvents: number;
    httpEvents: number;
    totalEvents: number;
  } | null;
  durableObjects: { type: string; doId: string }[];
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

      const controlProgress = Object.entries(result.controlFeeds.replicationProgress);
      if (controlProgress.length > 0) {
        yield* printSection('Control Feeds', controlProgress.map(
          ([key, progress]) => `${key}: replicated=${progress.replicated} processed=${progress.processed}`,
        ));
      }

      const { dataFeeds } = result.echo;
      const indexer = result.echo.indexerStatus;
      const indexerLabel = indexer.indexingInProgress
        ? `indexing (${indexer.totalChanges} total changes)`
        : `idle (${indexer.totalChanges} total changes)`;
      yield* printSection('Echo', [
        `Data feeds:       ${dataFeeds.count} (${dataFeeds.totalBlocks} blocks)`,
        `Documents:        ${result.echo.documentCount} (${result.echo.indexedDocumentCount} indexed)`,
        `Objects:          ${result.echo.objectCount} active, ${result.echo.deletedObjectCount} deleted`,
        `Indexer:          ${indexerLabel}`,
        ...indexer.cursors.map(
          (cursor) => `  ${cursor.indexName}/${cursor.sourceName}: ${cursor.cursor}`,
        ),
        ...dataFeeds.byNamespace.flatMap((ns) => [
          `${ns.namespace}:`,
          ...ns.feeds.map((feed) => `  ${feed.feedId} (${feed.blockCount} blocks)`),
        ]),
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
