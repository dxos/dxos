//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';
import type * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import { DebugNodes } from '#types';

import { mountedPanels } from '../containers/DebugPanel/mounted.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const retention: AppGraphBuilder.Retention = {
      retained: Atom.make((get) => (get(mountedPanels) > 0 ? [{ id: DebugNodes.DEBUG_ROOT_ID }] : [])),
    };

    return Capability.contribute(AppCapabilities.AppGraphRetention, retention);
  }),
);
