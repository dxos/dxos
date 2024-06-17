import type { Repo } from '@dxos/automerge/automerge-repo';
import type { CreateEpochRequest } from '@dxos/protocols/proto/dxos/client/services';

export type MigrationContext = {
  repo: Repo;
  migration?: CreateEpochRequest.Migration;
  currentRoot: string | null;
};

export type MigrationResult = {
  newRoot?: string;
};

export async function runEpochMigration(context: MigrationContext): Promise<MigrationResult> {
  return {};
}
