//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Type } from '@dxos/echo';

import { SheetOperation } from '#types';
import { Sheet } from '#types';

const activate = Effect.fnUntraced(function* () {
  const config: AppCapabilities.CommentConfig = {
    id: Type.getTypename(Sheet.Sheet),
    comments: 'anchored',
    scrollToAnchor: SheetOperation.ScrollToAnchor,
  };
  return Capability.contributes(AppCapabilities.CommentConfig, config);
});

export default activate;
