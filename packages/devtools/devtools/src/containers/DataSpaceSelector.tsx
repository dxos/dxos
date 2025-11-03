//
// Copyright 2020 DXOS.org
//

import * as localForage from 'localforage';
import React from 'react';

import { invariant } from '@dxos/invariant';
import { type Space, SpaceId, useSpaces } from '@dxos/react-client/echo';
import { useAsyncEffect } from '@dxos/react-hooks';
import { Select } from '@dxos/react-ui';

import { useDevtoolsDispatch, useDevtoolsState, useSpacesInfo } from '../hooks';

export const DataSpaceSelector = () => {
  const spaces = useSpaces({ all: true });
  const spacesInfo = useSpacesInfo();
  const { space } = useDevtoolsState();
  const setState = useDevtoolsDispatch();

  const handleSelect = (spaceId?: SpaceId) => {
    const space = spaceId ? spaces.find((space) => space.id === spaceId) : undefined;
    // TODO(dmaretskyi): Expose id in space info.
    const spaceInfo = space ? spacesInfo.find((spaceInfo) => spaceInfo.key.equals(space.key)) : undefined;
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

  const getLabel = (space: Space) => (space?.isOpen ? (space?.properties.name ?? 'New space') : '(closed)');

  return (
    <Select.Root
      value={space?.id}
      onValueChange={(id) => {
        id && handleSelect?.(id as SpaceId);
      }}
    >
      <Select.TriggerButton placeholder='Select space' />
      <Select.Portal>
        <Select.Content>
          <Select.Viewport>
            {spaces.map((space) => (
              <Select.Option key={space.id} value={space.id}>
                <div className='flex items-center gap-2'>
                  <span className='font-mono text-neutral-250'>{space.id.slice(0, 6)}</span>
                  {getLabel(space)}
                </div>
              </Select.Option>
            ))}
          </Select.Viewport>
          <Select.Arrow />
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
};
