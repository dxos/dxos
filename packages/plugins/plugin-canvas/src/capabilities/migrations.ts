//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { Legacy } from '@dxos/scene';

// The module alone, not the model barrel: migration providers load eagerly in every environment.
import { SceneMigrations } from '../model/migrations.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // The content steps of a legacy drawing, then the stored scene objects' own: a layout, model or style catalog
    // written before version 0.2.0 of the stored types is rewritten in the current words when its space loads.
    return Capability.contribute(ClientCapabilities.Migration, [...SceneMigrations, ...Legacy.Migrations]);
  }),
);
