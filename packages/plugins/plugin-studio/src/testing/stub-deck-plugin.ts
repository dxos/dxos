//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import { DXN } from '@dxos/echo';

/**
 * No-op handler for the one layout operation the storyboard invokes that belongs to the deck, which
 * stories do not install: opening the frame companion. `Select` is deliberately NOT stubbed — it
 * belongs to AttentionPlugin (in `corePlugins`), and a no-op would swallow the selection the stack
 * publishes, leaving `useSelection` empty and the companion dead.
 */
const StubDeckOperations = Capability.inlineModule(
  'operation-handler',
  { provides: [Capabilities.OperationHandler] },
  () =>
    Effect.succeed([
      Capability.contribute(
        Capabilities.OperationHandler,
        OperationHandlerSet.make(Operation.withHandler(LayoutOperation.UpdateCompanion, () => Effect.void)),
      ),
    ]),
);

export const StubDeckPlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.studio.story.stubDeck'), name: 'Deck (stub)' }),
).pipe(Plugin.addModule(StubDeckOperations), Plugin.make);
