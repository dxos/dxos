//
// Copyright 2022 DXOS.org
//

import React, { useState } from 'react';

import { log } from '@dxos/log';
import { type IdentityInspectionResponse } from '@dxos/protocols';
import { useDevices, useIdentity } from '@dxos/react-client/halo';
import { useEdgeClient } from '@dxos/react-edge-client';
import { Toolbar } from '@dxos/react-ui';

import { JsonView, PanelContainer } from '../../../components';
import { VaultSelector } from '../../../containers';

export const IdentityPanel = () => {
  const identity = useIdentity();
  const devices = useDevices();
  const edgeClient = useEdgeClient();
  const [edgeInfo, setEdgeInfo] = useState<IdentityInspectionResponse | null>(null);

  const handleInspectOnEdge = async () => {
    if (!identity) {
      return;
    }
    try {
      const result = await edgeClient.inspectIdentity(identity.identityKey.toHex());
      setEdgeInfo(result);
    } catch (err) {
      log.catch(err);
    }
  };

  return (
    <PanelContainer
      toolbar={
        <Toolbar.Root>
          <VaultSelector />
          <div className='grow' />
          <Toolbar.Button onClick={handleInspectOnEdge}>Inspect on EDGE</Toolbar.Button>
        </Toolbar.Root>
      }
    >
      <JsonView data={{ ...identity, devices }} />
      {edgeInfo && (
        <div className='border-t border-separator'>
          <JsonView data={edgeInfo} />
        </div>
      )}
    </PanelContainer>
  );
};
