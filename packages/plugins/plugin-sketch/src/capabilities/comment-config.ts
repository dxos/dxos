//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Type } from '@dxos/echo';

import { Sketch } from '#types';

const activate = Effect.fnUntraced(function* () {
  return [
    Capability.provide(AppCapabilities.CommentConfig, {
      id: Type.getTypename(Sketch.Sketch),
      comments: 'unanchored',
    }),
  ];
});

export default activate;
