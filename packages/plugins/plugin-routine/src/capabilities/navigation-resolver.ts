//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, Paths, TypeSection } from '@dxos/app-toolkit';

import { Routine } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.provide(
      AppCapabilities.NavigationPathResolver,
      TypeSection.createTypeSectionPathResolver(Routine.Routine, { groupId: Paths.GroupSegments.ai }),
    );
  }),
);
