//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { Type } from '@dxos/echo';

import { Sheet, SheetOperation } from '#types';
import { SheetEvents } from '#types';

export const CommentConfig = AppCapability.commentConfig(
  Effect.fnUntraced(function* () {
    const config: AppCapabilities.CommentConfig = {
      id: Type.getTypename(Sheet.Sheet),
      comments: 'anchored',
      scrollToAnchor: SheetOperation.ScrollToAnchor,
    };
    return [Capability.contribute(AppCapabilities.CommentConfig, config)];
  }),
  {
    activatesOn: SheetEvents.Start,
    environments: ['node'],
  },
);
