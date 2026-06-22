//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode, TypeSection } from '@dxos/app-toolkit';
import { Channel } from '@dxos/types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [
      Capability.contributes(
        AppCapabilities.NavigationPathResolver,
        TypeSection.createTypeSectionPathResolver(Channel.Channel, { groupId: AppNode.NAV_TREE_GROUP_COMM_ID }),
      ),
    ];
  }),
);
