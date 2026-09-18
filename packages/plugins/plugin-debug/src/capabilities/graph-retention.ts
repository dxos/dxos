//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import { DebugNodes } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Neither host of the panel — the deck's drawer nor the floating window — owns this subtree.
    // TODO(wittjosiah): Release it when no host is showing it.
    const retention: AppCapabilities.AppGraphRetention = {
      retained: Atom.make([{ id: DebugNodes.DEBUG_ROOT_ID }]),
    };

    return Capability.contribute(AppCapabilities.AppGraphRetention, retention);
  }),
);
