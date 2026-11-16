//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { Type } from '@dxos/echo';

import { Sheet, SheetOperation } from '#types';

const activate = Effect.fnUntraced(function* () {
  const locator: AppCapabilities.Locator = {
    id: Type.getTypename(Sheet.Sheet),
    reveal: SheetOperation.ScrollToAnchor,
  };
  return [Capability.contribute(AppCapabilities.Locator, locator)];
});

export default activate;
