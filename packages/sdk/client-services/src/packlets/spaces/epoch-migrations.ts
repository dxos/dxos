//
// Copyright 2024 DXOS.org
//

import type { AutomergeUrl } from '@automerge/automerge-repo';

import { type Context } from '@dxos/context';
import { type EchoHost } from '@dxos/echo-host';
import { invariant } from '@dxos/invariant';
import type { PublicKey, SpaceId } from '@dxos/keys';
import { SpacesService } from '@dxos/protocols/rpc';

export type MigrationContext = {
  echoHost: EchoHost;

  spaceId: SpaceId;
  /**
   * @deprecated Remove.
   */
  spaceKey: PublicKey;
  migration: SpacesService.Migration;
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
    case SpacesService.Migration.enums.INIT_AUTOMERGE: {
      using document = await context.echoHost.createDoc();
      await context.echoHost.flush(ctx);
      return { newRoot: document.url };
    }
    case SpacesService.Migration.enums.PRUNE_AUTOMERGE_ROOT_HISTORY: {
      if (!context.currentRoot) {
        throw new Error('Space does not have an automerge root');
      }
      using rootLease = await context.echoHost.loadDoc(ctx, context.currentRoot as AutomergeUrl, {
        timeout: LOAD_DOC_TIMEOUT,
      });
      invariant(rootLease, 'Automerge root document must load for history prune migration.');

      using newRoot = await context.echoHost.createDoc(rootLease.doc());
      await context.echoHost.flush(ctx);
      return { newRoot: newRoot.url };
    }
    case SpacesService.Migration.enums.FRAGMENT_AUTOMERGE_ROOT: {
      throw new Error('Migration not available');
    }
    case SpacesService.Migration.enums.MIGRATE_REFERENCES_TO_DXN: {
      throw new Error('Migration not available');
    }
    // TODO(dmaretskyi): This path doesn't seem to fit here. This is not a migration.
    case SpacesService.Migration.enums.REPLACE_AUTOMERGE_ROOT: {
      invariant(context.newAutomergeRoot);

      // Defensive programming - it should be the responsibility of the caller to flush the new root.
      await context.echoHost.flush(ctx);
      return {
        newRoot: context.newAutomergeRoot,
      };
    }
  }

  return {};
};
