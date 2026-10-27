//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { Migration, Obj } from '@dxos/echo';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { Repo } from '@dxos/types';

import { LegacyRepository } from '#types';

// `org.dxos.type.repository` -> `org.dxos.type.repo`. The object keeps its id, and the id EDGE knows
// the repository by (that same id) moves into the EDGE key, so the remote keeps resolving.
export const repositoryToRepo = Migration.define({
  from: LegacyRepository.Repository,
  to: Repo.Repo,
  transform: async ({ id, name, description, defaultBranch }, { db }) => ({
    name: name ?? '',
    owner: db.spaceId,
    description,
    defaultBranch,
    [Obj.Meta]: { keys: [{ source: Repo.EDGE_SOURCE, id }] },
  }),
});

const migrations = [repositoryToRepo];

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(ClientCapabilities.Migration, migrations);
  }),
);
