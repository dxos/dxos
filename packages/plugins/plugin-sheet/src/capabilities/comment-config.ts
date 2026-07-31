//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { Type } from '@dxos/echo';

import { SheetOperation } from '#types';
import { Sheet } from '#types';

const activate = Effect.fnUntraced(function* () {
  const config: AppCapabilities.CommentConfig = {
    id: Type.getTypename(Sheet.Sheet),
    comments: 'anchored',
    scrollToAnchor: SheetOperation.ScrollToAnchor,
  };
  return [Capability.contribute(AppCapabilities.CommentConfig, config)];
});

export default activate;
