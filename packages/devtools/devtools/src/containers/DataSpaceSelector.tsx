//
// Copyright 2020 DXOS.org
//

import * as localForage from 'localforage';
import React from 'react';

import { invariant } from '@dxos/invariant';
import { SpaceId } from '@dxos/keys';
import { toPublicKey } from '@dxos/protocols/buf';
import { type Space, useSpaces } from '@dxos/react-client/echo';
import { useAsyncEffect } from '@dxos/react-hooks';
import * as Select from '@dxos/react-ui/Select';

import { useDevtoolsDispatch, useDevtoolsState, useSpacesInfo } from '../hooks/index.ts';

export const DataSpaceSelector = () => {
  const spaces = useSpaces({ all: true });
  const spacesInfo = useSpacesInfo();
  const { space } = useDevtoolsState();
  const setState = useDevtoolsDispatch();

  const handleSelect = (spaceId?: SpaceId) => {
    const space = spaceId ? spaces.find((space) => space.id === spaceId) : undefined;
    // TODO(dmaretskyi): Expose id in space info.
    const spaceInfo = space ? spacesInfo.find((spaceInfo) => toPublicKey(spaceInfo.key)?.equals(space.key)) : undefined;
    setState((state) => ({
      ...state,
      space,
      spaceInfo,
    }));

    if (spaceId) {
      void localForage.setItem('dxos.devtools.spaceId', spaceId);
    }
  };

  useAsyncEffect(async () => {
    const spaceId: SpaceId | null = await localForage.getItem('dxos.devtools.spaceId');
    if (spaceId) {
      invariant(SpaceId.isValid(spaceId));
      handleSelect(spaceId);
    }
  }, []);

  const getLabel = (space: Space) => {
    return space?.isOpen ? (space?.properties.name ?? 'New space') : '(closed)';
  };

  const items = spaces.map((space) => ({ value: space.id, label: `${space.id.slice(0, 6)} ${getLabel(space)}` }));
  return (
    <Select.Root
      items={items}
      value={space ? [space.id] : []}
      onValueChange={({ value: [id] }) => {
        const selected = spaces.find((candidate) => candidate.id === id);
        if (selected) {
          handleSelect?.(selected.id);
        }
      }}
    >
      <Select.Trigger placeholder='Select space' />
      <Select.Content>
        {items.map((item) => (
          <Select.Item key={item.value} item={item} />
        ))}
      </Select.Content>
    </Select.Root>
  );
};
