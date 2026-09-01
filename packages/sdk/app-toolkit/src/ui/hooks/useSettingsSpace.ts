//
// Copyright 2026 DXOS.org
//

import { type Obj } from '@dxos/echo';
import { useClient } from '@dxos/react-client';
import {
  type ObjectUpdateCallback,
  type Space,
  type SpaceProperties,
  useSpaceProperties,
  useSpaces,
} from '@dxos/react-client/echo';

import * as AppSpace from '../../echo/AppSpace.ts';

/**
 * Reactive lookup of the settings space, where app-wide configuration lives.
 *
 * `undefined` until the space resolves: a profile may not have one on first load (it arrives via
 * identity setup or the migration), which is why this subscribes to the space list rather than
 * reading it once — {@link AppSpace.getSettingsSpace} on its own never re-renders the caller.
 */
export const useSettingsSpace = (): Space | undefined => {
  const client = useClient();
  const spaces = useSpaces();

  return spaces.length ? AppSpace.getSettingsSpace(client) : undefined;
};

/** Reactive properties of the settings space, paired with an updater. */
export const useSettingsSpaceProperties = (): [
  Obj.Snapshot<SpaceProperties> | undefined,
  ObjectUpdateCallback<SpaceProperties>,
] => useSpaceProperties(useSettingsSpace()?.id);

/**
 * Reactive lookup of the space designated as the default target for unscoped content.
 *
 * The designation lives on the settings space properties, so this re-resolves both when the space
 * list changes and when the user picks a different default — on this device or another.
 */
export const useDefaultSpace = (): Space | undefined => {
  const client = useClient();
  const [settingsProperties] = useSettingsSpaceProperties();

  return settingsProperties && AppSpace.getDefaultSpace(client);
};
