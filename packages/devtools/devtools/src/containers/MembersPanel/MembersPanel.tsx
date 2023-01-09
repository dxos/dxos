//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { Box } from '@mui/material';

import { PublicKey } from '@dxos/keys';
import { useMembers, useSpaces } from '@dxos/react-client';
import { JsonTreeView } from '@dxos/react-components-deprecated';

import { KeySelect, Panel } from '../../components';

export const MembersPanel = () => {
  const [selectedSpaceKey, setSelectedSpaceKey] = useState<PublicKey>();
  const members = useMembers(selectedSpaceKey);

  const spaces = useSpaces();

  return (
    <Panel
      controls={
        <KeySelect
          label='Space'
          keys={spaces.map(({ key }) => key)}
          selected={selectedSpaceKey}
          onChange={(key) => setSelectedSpaceKey(key)}
          humanize={true}
        />
      }
    >
      <Box flex={1}>{selectedSpaceKey && <JsonTreeView data={{ members }} />}</Box>
    </Panel>
  );
};
