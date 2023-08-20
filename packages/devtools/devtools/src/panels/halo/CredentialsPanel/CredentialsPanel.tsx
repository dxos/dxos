//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { Toolbar } from '@dxos/aurora';
import { createDateColumn, createKeyColumn, GridColumn } from '@dxos/aurora-grid';
import { Credential } from '@dxos/protocols/proto/dxos/halo/credentials';

import { MasterDetailTable, PanelContainer } from '../../../components';
import { SpaceSelector } from '../../../containers';
import { useDevtoolsState, useCredentials } from '../../../hooks';

const columns: GridColumn<Credential>[] = [
  createKeyColumn('id'),
  createKeyColumn('issuer'),
  createKeyColumn('subject', { value: (credential) => credential.subject.assertion['@type'] }),
  // TODO(burdon): Value as accessor?
  createDateColumn('issued', { format: 'MM/dd HH:mm:ss O' }, { value: (credential) => credential.issuanceDate }),
];

export const CredentialsPanel = () => {
  const { space } = useDevtoolsState();
  const credentials = useCredentials({ spaceKey: space?.key });

  return (
    <PanelContainer
      toolbar={
        <Toolbar.Root>
          <SpaceSelector />
        </Toolbar.Root>
      }
    >
      <MasterDetailTable<Credential> columns={columns} data={credentials} />
    </PanelContainer>
  );
};
