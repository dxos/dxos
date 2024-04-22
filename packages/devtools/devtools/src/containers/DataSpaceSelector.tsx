//
// Copyright 2020 DXOS.org
//

import * as localForage from 'localforage';
import React from 'react';

import { useAsyncEffect } from '@dxos/react-async';
import { PublicKey } from '@dxos/react-client';
import { useSpaces } from '@dxos/react-client/echo';
import { humanize } from '@dxos/util';

import { PublicKeySelector } from '../components';
import { useDevtoolsDispatch, useDevtoolsState, useSpacesInfo } from '../hooks';

export const DataSpaceSelector = () => {
  const spaces = useSpaces({ all: true });
  const spacesInfo = useSpacesInfo();
  const { space } = useDevtoolsState();
  const setState = useDevtoolsDispatch();

  const handleSelect = (spaceKey?: PublicKey) => {
    setState((state) => ({
      ...state,
      space: spaceKey ? spaces.find((space) => space.key.equals(spaceKey)) : undefined,
      spaceInfo: spaceKey ? spacesInfo.find((spaceInfo) => spaceInfo.key.equals(spaceKey)) : undefined,
    }));

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
    const space = spaces.find((space) => space.key.equals(key));
    return space?.properties.name ?? humanize(key);
  };

  return (
    <PublicKeySelector
      placeholder='Select space'
      getLabel={getLabel}
      keys={spaces.map((space) => space.key)}
      value={space?.key}
      onChange={handleSelect}
    />
  );
};
