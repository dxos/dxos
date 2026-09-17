//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';
import type * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import { DebugNodes } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // The panel's two hosts — the deck's drawer and the floating window — share this subtree, and
    // neither owns its lifetime, so it stays loaded for the session.
    // TODO(wittjosiah): Release it when no host is showing it.
    const retention: AppGraphBuilder.Retention = {
      retained: Atom.make([{ id: DebugNodes.DEBUG_ROOT_ID }]),
    };

    return Capability.contribute(AppCapabilities.AppGraphRetention, retention);
  }),
);
