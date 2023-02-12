//
// Copyright 2022 DXOS.org
//

import { Box, Text, useFocus, useFocusManager } from 'ink';
import React, { useState } from 'react';

import { useSpace } from '@dxos/react-client';

import { useAppState } from '../../hooks';
import { ItemList } from './ItemList';
import { ItemTypeList } from './ItemTypeList';
import { SpaceList } from './SpaceList';

export const SpaceView = () => {
  const { focus } = useFocus({ isActive: false });
  const { focusNext } = useFocusManager();
  const [{ spaceKey }, { setSpaceKey }] = useAppState();
  const [type, setType] = useState<string>();
  const space = useSpace(spaceKey);

  return (
    <Box flexDirection='column' flexGrow={1}>
      <Box flexDirection='column' flexGrow={1}>
        <SpaceList
          spaceKey={space?.key}
          onSelect={(spaceKey) => {
            setSpaceKey(spaceKey);
            focusNext();
          }}
        />
      </Box>

      {space && (
        <Box flexDirection='column' flexGrow={1}>
          <ItemList
            space={space}
            type={type}
            onCancel={() => {
              focus('space-list');
            }}
          />

          <ItemTypeList space={space} onChange={setType} />

          <Box padding={1}>
            <Text>ENTER to select ECHO Space; TAB/arrow keys to navigate; SHIFT-TAB to return.</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
};
