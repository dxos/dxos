//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

// The module alone, not the types barrel: migration providers load eagerly in every environment.
import { presentationMigration } from '../types/PresentationMigration.ts';
import { makeShowcaseMigration } from '../types/ShowcaseMigration.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(ClientCapabilities.Migration, [presentationMigration, makeShowcaseMigration()]);
  }),
);
