//
// Copyright 2025 DXOS.org
//

import { effect } from '@preact/signals-core';

import { Capabilities, contributes, type PluginsContext } from '@dxos/app-framework/next';
import { PublicKey } from '@dxos/keys';
import { LocalStorageStore } from '@dxos/local-storage';
import { ComplexMap } from '@dxos/util';

import { SpaceCapabilities } from './capabilities';
import { SPACE_PLUGIN } from '../meta';
import { type PluginState } from '../types';

export default (context: PluginsContext) => {
  const state = new LocalStorageStore<PluginState>(SPACE_PLUGIN, {
    awaiting: undefined,
    spaceNames: {},
    viewersByObject: {},
    // TODO(wittjosiah): Stop using (Complex)Map inside reactive object.
    viewersByIdentity: new ComplexMap(PublicKey.hash),
    sdkMigrationRunning: {},
    navigableCollections: false,
    enabledEdgeReplication: false,
  });

  state
    .prop({ key: 'spaceNames', type: LocalStorageStore.json<Record<string, string>>() })
    .prop({ key: 'enabledEdgeReplication', type: LocalStorageStore.bool() });

  const manager = context.requestCapability(Capabilities.PluginManager);
  const unsubscribe = effect(() => {
    // TODO(wittjosiah): Find a way to make this capability-based.
    const enabled = manager.enabled.includes('dxos.org/plugin/stack');
    if (enabled !== state.values.navigableCollections) {
      state.values.navigableCollections = enabled;
    }
  });

  return contributes(SpaceCapabilities.State, state.values, () => {
    unsubscribe();
    state.close();
  });
};
