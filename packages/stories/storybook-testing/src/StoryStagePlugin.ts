//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import { DXN } from '@dxos/keys';

/** Stubs the deck's layout operations, which plugins invoke and a story without a deck lacks. */
export const make = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.storybook.plugin.stage'), name: 'Story Stage' }),
).pipe(
  Plugin.addModule({
    id: 'org.dxos.storybook.plugin.stage.module.handler',
    provides: [Capabilities.OperationHandler],
    activate: () =>
      Effect.succeed([
        Capability.contribute(
          Capabilities.OperationHandler,
          OperationHandlerSet.make(
            Operation.withHandler(LayoutOperation.ScrollIntoView, () => Effect.void),
            Operation.withHandler(LayoutOperation.UpdateCompanion, () => Effect.void),
          ),
        ),
      ]),
  }),
  Plugin.make,
);
