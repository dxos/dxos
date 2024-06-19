//
// Copyright 2024 DXOS.org
//

import { asyncTimeout } from '@dxos/async';
import type { Repo, AutomergeUrl } from '@dxos/automerge/automerge-repo';
import { cancelWithContext, type Context } from '@dxos/context';
import { convertLegacyReferences, convertLegacySpaceRootDoc, findInlineObjectOfType } from '@dxos/echo-db';
import { AutomergeDocumentLoaderImpl } from '@dxos/echo-pipeline';
import type { SpaceDoc } from '@dxos/echo-protocol';
import { TYPE_PROPERTIES } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import type { PublicKey, SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { CreateEpochRequest } from '@dxos/protocols/proto/dxos/client/services';
import { assignDeep } from '@dxos/util';

export type MigrationContext = {
  repo: Repo;
  spaceId: SpaceId;
  /**
   * @deprecated Remove.
   */
  spaceKey: PublicKey;
  migration: CreateEpochRequest.Migration;
  currentRoot: string | null;

  /**
   * For set automerge root migration type.
   */
  newAutomergeRoot?: string;
};

export type MigrationResult = {
  newRoot?: string;
};

export const runEpochMigration = async (ctx: Context, context: MigrationContext): Promise<MigrationResult> => {
  switch (context.migration) {
    case CreateEpochRequest.Migration.INIT_AUTOMERGE: {
      const document = context.repo.create();
      await context.repo.flush();
      return { newRoot: document.url };
    }
    case CreateEpochRequest.Migration.PRUNE_AUTOMERGE_ROOT_HISTORY: {
      if (!context.currentRoot) {
        throw new Error('Space does not have an automerge root');
      }
      const rootHandle = context.repo.find(context.currentRoot as AutomergeUrl);
      await cancelWithContext(ctx, asyncTimeout(rootHandle.whenReady(), 10_000));

      const newRoot = context.repo.create(rootHandle.docSync());
      await context.repo.flush();
      return { newRoot: newRoot.url };
    }
    case CreateEpochRequest.Migration.FRAGMENT_AUTOMERGE_ROOT: {
      log.info('Fragmenting');

      const currentRootUrl = context.currentRoot;
      const rootHandle = context.repo.find<SpaceDoc>(currentRootUrl as any);
      await cancelWithContext(ctx, asyncTimeout(rootHandle.whenReady(), 10_000));

      // Find properties object.
      const objects = Object.entries((rootHandle.docSync() as SpaceDoc).objects!);
      const properties = findInlineObjectOfType(rootHandle.docSync() as SpaceDoc, TYPE_PROPERTIES);
      const otherObjects = objects.filter(([key]) => key !== properties?.[0]);
      invariant(properties, 'Properties not found');

      // Create a new space doc with the properties object.
      const newSpaceDoc: SpaceDoc = { ...rootHandle.docSync(), objects: Object.fromEntries([properties]) };
      const newRoot = context.repo.create(newSpaceDoc);
      invariant(typeof newRoot.url === 'string' && newRoot.url.length > 0);

      // Create new automerge documents for all objects.
      const docLoader = new AutomergeDocumentLoaderImpl(context.spaceId, context.repo, context.spaceKey);
      await docLoader.loadSpaceRootDocHandle(ctx, { rootUrl: newRoot.url });

      otherObjects.forEach(([key, value]) => {
        const handle = docLoader.createDocumentForObject(key);
        handle.change((doc: any) => {
          assignDeep(doc, ['objects', key], value);
        });
      });

      await context.repo.flush();
      return {
        newRoot: newRoot.url,
      };
    }
    case CreateEpochRequest.Migration.MIGRATE_REFERENCES_TO_DXN: {
      const currentRootUrl = context.currentRoot;
      const rootHandle = context.repo.find<SpaceDoc>(currentRootUrl as any);
      await cancelWithContext(ctx, asyncTimeout(rootHandle.whenReady(), 10_000));
      invariant(rootHandle.docSync(), 'Root doc not found');

      const newRootContent = await convertLegacySpaceRootDoc(structuredClone(rootHandle.docSync()!));

      log.info('converted', { newRootContent });

      for (const [id, url] of Object.entries(newRootContent.links ?? {})) {
        const handle = context.repo.find(url as any);
        await cancelWithContext(ctx, asyncTimeout(handle.whenReady(), 10_000));
        invariant(handle.docSync(), 'Doc not found');
        log.info('will convert', { source: structuredClone(handle.docSync()!) });
        const newDoc = await convertLegacyReferences(structuredClone(handle.docSync()!));
        log.info('converted', { newDoc });
        const newHandle = context.repo.create(newDoc);
        newRootContent.links![id] = newHandle.url;
      }

      const newRoot = context.repo.create(newRootContent);

      await context.repo.flush();
      return {
        newRoot: newRoot.url,
      };
    }
    // TODO(dmaretskyi): This path doesn't seem to fit here. This is not a migration.
    case CreateEpochRequest.Migration.REPLACE_AUTOMERGE_ROOT: {
      invariant(context.newAutomergeRoot);

      // Defensive programming - it should be the responsibility of the caller to flush the new root.
      await context.repo.flush();
      return {
        newRoot: context.newAutomergeRoot,
      };
    }
  }

  return {};
};
