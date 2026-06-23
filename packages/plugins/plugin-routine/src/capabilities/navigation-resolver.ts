//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode, TypeSection } from '@dxos/app-toolkit';

import { Routine } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [
      Capability.contributes(
        AppCapabilities.NavigationPathResolver,
        TypeSection.createTypeSectionPathResolver(Routine.Routine, { groupId: AppNode.NAV_TREE_GROUP_AI_ID }),
      ),
    ];
  }),
);
