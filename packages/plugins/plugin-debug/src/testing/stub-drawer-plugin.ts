//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { useSyncExternalStore } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import { DXN } from '@dxos/echo';
import { type DrawerState } from '@dxos/react-ui';

//
// Drawer state, as the deck would own it: the stub handler below writes it and a story's frame reads it.
//

let drawerState: DrawerState = 'open';
const listeners = new Set<() => void>();

export const getDrawerState = () => drawerState;

export const setDrawerState = (next: DrawerState) => {
  drawerState = next;
  listeners.forEach((listener) => listener());
};

export const useDrawerState = () =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => drawerState,
  );

/** Stands in for the deck's layout handler, so the panel's toggle, close and float controls move the drawer. */
export const StubDrawerPlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.debug.story.stubDrawer'), name: 'Drawer (stub)' }),
).pipe(
  Plugin.addModule(
    Capability.inlineModule('stub-drawer-operations', { provides: [Capabilities.OperationHandler] }, () =>
      Effect.succeed([
        Capability.contribute(
          Capabilities.OperationHandler,
          OperationHandlerSet.make(
            Operation.withHandler(LayoutOperation.UpdateDrawer, ({ state }) =>
              Effect.sync(() => {
                if (state === 'toggle') {
                  setDrawerState(drawerState === 'open' ? 'closed' : 'open');
                } else if (state) {
                  setDrawerState(state);
                }
              }),
            ),
          ),
        ),
      ]),
    ),
  ),
  Plugin.make,
);
