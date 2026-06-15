//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, createTypeSectionPathResolver } from '@dxos/app-toolkit';

import { Automation } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(
      AppCapabilities.NavigationPathResolver,
      createTypeSectionPathResolver(Automation.Automation),
    );
  }),
);
