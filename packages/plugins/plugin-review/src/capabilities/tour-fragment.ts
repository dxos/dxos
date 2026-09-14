//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import { steps } from '../tours/index.ts';
import { getCommentConfig } from '../util/commentable.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;

    return Capability.contribute(AppCapabilities.TourFragment, {
      matches: (data) => getCommentConfig(capabilities, data) !== undefined,
      steps,
    });
  }),
);
