//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { LegacySpaceProperties, SpaceProperties } from '@dxos/client-protocol';
import { Migration } from '@dxos/echo';
import { ClientCapabilities } from '@dxos/plugin-client';
import { AccessToken, AnchoredTo, HasConnection, HasRelationship, HasSubject } from '@dxos/types';

const identityTransform = async (from: any) => ({ ...from });
const noopCallback = async () => {};

const migrations = [
  Migration.define({
    from: LegacySpaceProperties,
    to: SpaceProperties,
    transform: identityTransform,
    onMigration: noopCallback,
  }),
  Migration.define({
    from: AccessToken.LegacyAccessToken,
    to: AccessToken.AccessToken,
    transform: identityTransform,
    onMigration: noopCallback,
  }),
  Migration.define({
    from: AnchoredTo.LegacyAnchoredTo,
    to: AnchoredTo.AnchoredTo,
    transform: identityTransform,
    onMigration: noopCallback,
  }),
  Migration.define({
    from: HasConnection.LegacyHasConnection,
    to: HasConnection.HasConnection,
    transform: identityTransform,
    onMigration: noopCallback,
  }),
  Migration.define({
    from: HasRelationship.LegacyHasRelationship,
    to: HasRelationship.HasRelationship,
    transform: identityTransform,
    onMigration: noopCallback,
  }),
  Migration.define({
    from: HasSubject.LegacyHasSubject,
    to: HasSubject.HasSubject,
    transform: identityTransform,
    onMigration: noopCallback,
  }),
];

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(ClientCapabilities.Migration, migrations);
  }),
);
