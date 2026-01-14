//
// Copyright 2024 DXOS.org
//

import type { AutomergeUrl } from '@automerge/automerge-repo';

import { type Context } from '@dxos/context';
import { type EchoHost } from '@dxos/echo-pipeline';
import { invariant } from '@dxos/invariant';
import type { PublicKey, SpaceId } from '@dxos/keys';
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
      const document = await context.echoHost.createDoc();
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

      const newRoot = await context.echoHost.createDoc(rootHandle.doc());
      await context.echoHost.flush();
      return { newRoot: newRoot.url };
    }
    case CreateEpochRequest.Migration.FRAGMENT_AUTOMERGE_ROOT: {
      throw new Error('Migration not available');
    }
    case CreateEpochRequest.Migration.MIGRATE_REFERENCES_TO_DXN: {
      throw new Error('Migration not available');
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
