//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { Toolbar } from '@dxos/aurora';
import { createDateColumn, createKeyColumn, createTextColumn, DateFormat, GridColumn } from '@dxos/aurora-grid';
import { Credential } from '@dxos/protocols/proto/dxos/halo/credentials';

import { MasterDetailTable, PanelContainer } from '../../../components';
import { SpaceSelector } from '../../../containers';
import { useDevtoolsState, useCredentials } from '../../../hooks';

const columns: GridColumn<Credential>[] = [
  createKeyColumn('id', { key: true }),
  createKeyColumn('issuer'),
  createTextColumn('subject', { accessor: (credential) => credential.subject.assertion['@type'] }),
  createDateColumn('issued', { format: DateFormat.DATE }, { accessor: 'issuanceDate' }),
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
