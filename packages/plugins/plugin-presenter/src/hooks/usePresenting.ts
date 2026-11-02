//
// Copyright 2025 DXOS.org
//

import type * as Schema from 'effect/Schema';
import { useCallback } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import { type Obj } from '@dxos/echo';
import * as DeckCapabilities from '@dxos/plugin-deck/DeckCapabilities';

import { PresenterOperation } from '#types';

import { isPresenting } from '../paths.ts';

/** An object `SetPresenting` can present. */
export type PresentableObject = Schema.Schema.Type<typeof PresenterOperation.SetPresenting.input>['object'];

/**
 * Enters (`true`) or exits (`false`) presentation for the given object via the `SetPresenting` operation.
 */
export const useSetPresenting = (object: PresentableObject) => {
  const { invokePromise } = Hooks.useOperationInvoker();

  return useCallback(
    (state: boolean) => invokePromise(PresenterOperation.SetPresenting, { object, state }),
    [invokePromise, object],
  );
};

/**
 * Exits presentation for the given object. Delegates to the toggle operation so the
 * fullscreen-revert and re-open run sequentially in a single handler — invoking them
 * separately races, leaving the deck stuck in fullscreen.
 */
export const useExitPresenter = (object: PresentableObject) => {
  const setPresenting = useSetPresenting(object);
  return useCallback(() => setPresenting(false), [setPresenting]);
};

/**
 * Whether the object is the one being presented; read from the deck's fullscreen plank so a fullscreen
 * change for another object leaves this one alone.
 */
export const useIsPresenting = (object: Obj.Unknown): boolean => {
  const ephemeral = Hooks.useOptionalAtomCapability(DeckCapabilities.EphemeralState);
  return ephemeral ? isPresenting(ephemeral, object) : false;
};
