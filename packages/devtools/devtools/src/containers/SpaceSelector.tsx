//
// Copyright 2024 DXOS.org
//

import * as localForage from 'localforage';
import React from 'react';

import { useAsyncEffect } from '@dxos/react-async';
import { PublicKey } from '@dxos/react-client';
import { useSpaces } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { humanize } from '@dxos/util';

import { PublicKeySelector } from '../components';
import { useDevtoolsDispatch, useDevtoolsState, useSpacesInfo } from '../hooks';

export const SpaceSelector = () => {
  const spaces = useSpaces({ all: true });
  const { space, haloSpaceKey: stateHaloSpaceKey } = useDevtoolsState();
  const spacesInfo = useSpacesInfo();
  const setState = useDevtoolsDispatch();
  const identity = useIdentity();

  const handleSelect = (spaceKey?: PublicKey) => {
    setState((state) => {
      const haloSpaceKey = identity?.spaceKey;
      if (haloSpaceKey && spaceKey?.equals(haloSpaceKey)) {
        return { ...state, haloSpaceKey: spaceKey, space: undefined, spaceInfo: undefined };
      } else {
        return {
          ...state,
          space: spaceKey ? spaces.find((space) => space.key.equals(spaceKey)) : undefined,
          spaceInfo: spaceKey ? spacesInfo.find((spaceInfo) => spaceInfo.key.equals(spaceKey)) : undefined,
          haloSpaceKey: undefined,
        };
      }
    });

    if (spaceKey) {
      void localForage.setItem('dxos.devtools.spaceKey', spaceKey.toHex());
    }
  };

  useAsyncEffect(async () => {
    const spaceKeyHex: string | null = await localForage.getItem('dxos.devtools.spaceKey');
    if (spaceKeyHex) {
      handleSelect(PublicKey.fromHex(spaceKeyHex));
    }
  }, []);

  const getLabel = (key: PublicKey) => {
    if (identity?.spaceKey && key.equals(identity.spaceKey)) {
      return 'HALO';
    }
    const space = spaces.find((space) => space.key.equals(key));
    return space?.properties.name ?? humanize(key);
  };

  const spaceKeys = spaces.map((space) => space.key);
  identity?.spaceKey && spaceKeys.push(identity.spaceKey);
  return (
    <PublicKeySelector
      placeholder='Select space'
      getLabel={getLabel}
      keys={spaceKeys}
      value={stateHaloSpaceKey || space?.key}
      onChange={handleSelect}
    />
  );
};
