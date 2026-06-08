//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, createTypeSectionPathResolver } from '@dxos/app-toolkit';
import { Type } from '@dxos/echo';
import { Channel } from '@dxos/types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(
      AppCapabilities.NavigationPathResolver,
      createTypeSectionPathResolver(Type.getTypename(Channel.Channel)),
    );
  }),
);
