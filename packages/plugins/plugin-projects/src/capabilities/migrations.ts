//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { LegacyProject } from '#types';

// In version order, so one pass takes a project from any earlier version to the current one.
export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(ClientCapabilities.Migration, [
      LegacyProject.projectSpecs,
      LegacyProject.projectRepositories,
    ]),
  ),
);
