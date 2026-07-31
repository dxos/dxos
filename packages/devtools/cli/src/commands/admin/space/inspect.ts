//
// Copyright 2025 DXOS.org
//

import * as Args from '@effect/cli/Args';
import * as Command from '@effect/cli/Command';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { CommandConfig } from '@dxos/cli-util';
import { type InspectSpaceResponse, type LegacyInspectSpaceResponse } from '@dxos/protocols';

import { adminRequest, formatAdminError, readIdentityDid } from '../util';

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
    const result = yield* adminRequest<InspectSpaceResponse | LegacyInspectSpaceResponse>(
      'GET',
      `/admin/spaces/${spaceId}`,
    ).pipe(Effect.catchAll((error) => Effect.fail(new Error(formatAdminError(error)))));

    if (yield* CommandConfig.isJson) {
      yield* Console.log(JSON.stringify(result, null, 2));
    } else {
      yield* Console.log(`Space: ${result.spaceId}`);

      if (result.metadata) {
        yield* Console.log(`  Status:   ${result.metadata.status ?? 'unknown'}`);
        yield* Console.log(`  Created:  ${result.metadata.createdAt}`);
        const metaIdentity =
          ('identityDid' in result.metadata && result.metadata.identityDid) ||
          ('identityKey' in result.metadata && result.metadata.identityKey) ||
          undefined;
        if (metaIdentity) {
          yield* Console.log(`  Identity: ${metaIdentity}`);
        }
      } else {
        yield* Console.log('  Metadata: not in registry');
      }

      yield* printSection(
        `Members (${result.members.count})`,
        result.members.list.map((member) => {
          const role = member.role ? ` [${member.role}]` : '';
          const agent = member.agentKey ? ` agent:${member.agentKey.slice(0, 12)}...` : '';
          return `${readIdentityDid(member)}${role}${agent}`;
        }),
      );

      const controlProgress = Object.entries(result.controlFeeds.replicationProgress);
      if (controlProgress.length > 0) {
        yield* printSection(
          'Control Feeds',
          controlProgress.map(
            ([key, progress]) => `${key}: replicated=${progress.replicated} processed=${progress.processed}`,
          ),
        );
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
        ...indexer.cursors.map((cursor) => `  ${cursor.indexName}/${cursor.sourceName}: ${cursor.cursor}`),
        ...dataFeeds.byNamespace.flatMap((ns) => [
          `${ns.namespace}:`,
          ...ns.feeds.map((feed) => `  ${feed.feedId} (${feed.blockCount} blocks)`),
        ]),
        ...result.echo.objectsByType.slice(0, 10).map((entry) => `  ${entry.typeURI}: ${entry.count}`),
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
        yield* printSection(
          'Durable Objects',
          result.durableObjects.map((dobj) => `${dobj.type}: ${dobj.doId}`),
        );
      }
    }
  }),
).pipe(Command.withDescription('Inspect a space.'));
