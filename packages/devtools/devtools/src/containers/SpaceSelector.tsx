//
// Copyright 2020 DXOS.org
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

export type SpaceSelectorProps = {
  includeHalo?: boolean;
};

export const SpaceSelector = ({ includeHalo }: SpaceSelectorProps = {}) => {
  const spaces = useSpaces({ all: true });
  const spacesInfo = useSpacesInfo();
  const { space } = useDevtoolsState();
  const setState = useDevtoolsDispatch();
  let haloSpaceKey: PublicKey | undefined;
  const identity = useIdentity();
  if (includeHalo && identity?.spaceKey) {
    haloSpaceKey = identity.spaceKey;
  }

  const handleSelect = (spaceKey?: PublicKey) => {
    if (haloSpaceKey && spaceKey?.equals(haloSpaceKey)) {
      setState((state) => ({ ...state, haloSpaceKey: spaceKey, useHaloSpaceKey: true }));
    } else {
      setState((state) => ({
        ...state,
        space: spaceKey ? spaces.find((space) => space.key.equals(spaceKey)) : undefined,
        spaceInfo: spaceKey ? spacesInfo.find((spaceInfo) => spaceInfo.key.equals(spaceKey)) : undefined,
        useHaloSpaceKey: false,
      }));
    }

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
    if (haloSpaceKey && key.equals(haloSpaceKey)) {
      return 'HALO space';
    }
    const space = spaces.find((space) => space.key.equals(key));
    return space?.properties.name ?? humanize(key);
  };

  const spaceKeys = spaces.map((space) => space.key);
  return (
    <PublicKeySelector
      placeholder='Select space'
      getLabel={getLabel}
      keys={haloSpaceKey ? [...spaceKeys, haloSpaceKey] : spaceKeys}
      value={space?.key}
      onChange={handleSelect}
    />
  );
};
