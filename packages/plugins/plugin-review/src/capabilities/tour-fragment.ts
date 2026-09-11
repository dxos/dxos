//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { Obj } from '@dxos/echo';

/**
 * Adds a comments step to any tour running on an object that can carry comments, matched against the
 * live comment-config registry so the step is present exactly when the button it points at is.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;

    return Capability.contribute(AppCapabilities.TourFragment, {
      matches: (data) =>
        Obj.isObject(data) &&
        capabilities.getAll(AppCapabilities.CommentConfig).some(({ id }) => id === Obj.getTypename(data)),
      steps: () => import('../tours/index.ts').then(({ steps }) => steps),
    });
  }),
);
