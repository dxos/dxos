//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Type } from '@dxos/echo';

import { Drawing } from '#types';

const activate = Effect.fnUntraced(function* () {
  return [
    Capability.contribute(AppCapabilities.CommentConfig, {
      id: Type.getTypename(Drawing.Drawing),
      comments: 'unanchored',
    }),
  ];
});

export default activate;
