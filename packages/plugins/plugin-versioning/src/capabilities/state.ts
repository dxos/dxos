//
// Copyright 2026 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';

import { VersioningCapabilities } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Version selection is per-user, per-session view state — deliberately not persisted.
    const versioningAtom = Atom.make<VersioningCapabilities.VersioningState>({
      selection: {},
      view: {},
      mode: {},
    }).pipe(Atom.keepAlive);

    return [
      Capability.contributes(VersioningCapabilities.VersioningState, versioningAtom),
      Capability.contributes(
        VersioningCapabilities.ReviewRenderPolicy,
        VersioningCapabilities.defaultReviewRenderPolicy,
      ),
    ];
  }),
);
