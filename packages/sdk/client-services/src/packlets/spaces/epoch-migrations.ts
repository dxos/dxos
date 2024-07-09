//
// Copyright 2024 DXOS.org
//

import type { AutomergeUrl } from '@dxos/automerge/automerge-repo';
import { type Context } from '@dxos/context';
import {
  convertLegacyReferences,
  convertLegacySpaceRootDoc,
  findInlineObjectOfType,
  migrateDocument,
  type EchoHost,
} from '@dxos/echo-db';
import { SpaceDocVersion, type SpaceDoc } from '@dxos/echo-protocol';
import { TYPE_PROPERTIES } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import type { PublicKey, SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { CreateEpochRequest } from '@dxos/protocols/proto/dxos/client/services';

export type MigrationContext = {
  echoHost: EchoHost;

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

const LOAD_DOC_TIMEOUT = 10_000;

export const runEpochMigration = async (ctx: Context, context: MigrationContext): Promise<MigrationResult> => {
  switch (context.migration) {
    case CreateEpochRequest.Migration.INIT_AUTOMERGE: {
      const document = context.echoHost.createDoc();
      await context.echoHost.flush();
      return { newRoot: document.url };
    }
    case CreateEpochRequest.Migration.PRUNE_AUTOMERGE_ROOT_HISTORY: {
      if (!context.currentRoot) {
        throw new Error('Space does not have an automerge root');
      }
      const rootHandle = await context.echoHost.loadDoc(ctx, context.currentRoot as AutomergeUrl, {
        timeout: LOAD_DOC_TIMEOUT,
      });

      const newRoot = context.echoHost.createDoc(rootHandle.docSync());
      await context.echoHost.flush();
      return { newRoot: newRoot.url };
    }
    case CreateEpochRequest.Migration.FRAGMENT_AUTOMERGE_ROOT: {
      log.info('Fragmenting');

      const currentRootUrl = context.currentRoot;
      const rootHandle = await context.echoHost.loadDoc<SpaceDoc>(ctx, currentRootUrl as any, {
        timeout: LOAD_DOC_TIMEOUT,
      });

      // Find properties object.
      const objects = Object.entries((rootHandle.docSync() as SpaceDoc).objects!);
      const properties = findInlineObjectOfType(rootHandle.docSync() as SpaceDoc, TYPE_PROPERTIES);
      const otherObjects = objects.filter(([key]) => key !== properties?.[0]);
      invariant(properties, 'Properties not found');

      // Create a new space doc with the properties object.
      const newRoot = context.echoHost.createDoc({
        ...rootHandle.docSync(),
        objects: Object.fromEntries([properties]),
      });
      invariant(typeof newRoot.url === 'string' && newRoot.url.length > 0);

      // Create new automerge documents for all objects.
      const newLinks: [string, AutomergeUrl][] = [];
      for (const [id, objData] of otherObjects) {
        const handle = context.echoHost.createDoc<SpaceDoc>({
          version: SpaceDocVersion.CURRENT,
          access: {
            spaceKey: context.spaceKey.toHex(),
          },
          objects: {
            [id]: objData,
          },
        });
        newLinks.push([id, handle.url]);
      }
      newRoot.change((doc: SpaceDoc) => {
        doc.links ??= {};
        for (const [id, url] of newLinks) {
          doc.links[id] = url;
        }
      });

      await context.echoHost.flush();
      return {
        newRoot: newRoot.url,
      };
    }
    case CreateEpochRequest.Migration.MIGRATE_REFERENCES_TO_DXN: {
      const currentRootUrl = context.currentRoot;
      const rootHandle = await context.echoHost.loadDoc<SpaceDoc>(ctx, currentRootUrl as any, {
        timeout: LOAD_DOC_TIMEOUT,
      });
      invariant(rootHandle.docSync(), 'Root doc not found');

      const newRootContent = await convertLegacySpaceRootDoc(structuredClone(rootHandle.docSync()!));

      for (const [id, url] of Object.entries(newRootContent.links ?? {})) {
        try {
          const handle = await context.echoHost.loadDoc(ctx, url as any, { timeout: LOAD_DOC_TIMEOUT });
          invariant(handle.docSync());
          const newDoc = await convertLegacyReferences(structuredClone(handle.docSync()!));
          const migratedDoc = migrateDocument(handle.docSync(), newDoc);
          const newHandle = context.echoHost.createDoc(migratedDoc, { preserveHistory: true });
          newRootContent.links![id] = newHandle.url;
        } catch (err) {
          log.warn('Failed to migrate reference', { id, url, error: err });
          delete newRootContent.links![id];
        }
      }

      const migratedRoot = migrateDocument(rootHandle.docSync(), newRootContent);
      const newRoot = context.echoHost.createDoc(migratedRoot, { preserveHistory: true });

      await context.echoHost.flush();
      return {
        newRoot: newRoot.url,
      };
    }
    // TODO(dmaretskyi): This path doesn't seem to fit here. This is not a migration.
    case CreateEpochRequest.Migration.REPLACE_AUTOMERGE_ROOT: {
      invariant(context.newAutomergeRoot);

      // Defensive programming - it should be the responsibility of the caller to flush the new root.
      await context.echoHost.flush();
      return {
        newRoot: context.newAutomergeRoot,
      };
    }
  }

  return {};
};
