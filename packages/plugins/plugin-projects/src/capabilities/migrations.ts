//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { Migration, Ref } from '@dxos/echo';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { Feature, LegacyFeature } from '#types';

/**
 * `Feature` 0.1.0 → 0.2.0: `in-progress` leaves the status (work is read from linked tasks), and each subfeature record
 * becomes a feature whose `parent` is the migrated one, so it can carry a description and requirements of its own.
 */
export const featureSubfeatures = Migration.define({
  from: LegacyFeature.Feature,
  to: Feature.Feature,
  transform: async ({ name, description, status, specs, project, code, position }) => ({
    name,
    description,
    status: LegacyFeature.toStatus(status),
    requirements: [],
    specs,
    project,
    code,
    position,
  }),
  // The children need a ref to the migrated object, which only exists once the transform has run.
  onMigration: async ({ before, object, db }) => {
    for (const subfeature of before.subfeatures ?? []) {
      db.add(
        Feature.make({
          name: subfeature.name,
          status: LegacyFeature.toStatus(subfeature.status),
          parent: Ref.make(object),
        }),
      );
    }
  },
});

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(ClientCapabilities.Migration, [featureSubfeatures]);
  }),
);
