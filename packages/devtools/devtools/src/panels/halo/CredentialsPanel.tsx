//
// Copyright 2020 DXOS.org
//

import { format } from 'date-fns';
import React from 'react';

import { Toolbar } from '@dxos/aurora';
import { mx } from '@dxos/aurora-theme';
import { TableColumn } from '@dxos/mosaic';
import { Credential } from '@dxos/protocols/proto/dxos/halo/credentials';

import { MasterDetailTable, PanelContainer } from '../../components';
import { SpaceSelector } from '../../containers';
import { useDevtoolsState, useCredentials } from '../../hooks';
import { textLink } from '../../styles';

const columns: TableColumn<Credential>[] = [
  {
    Header: 'ID',
    width: 60,
    Cell: ({ value }: any) => <div className={mx('font-mono', textLink)}>{value.truncate()}</div>,
    accessor: 'id',
  },
  {
    Header: 'Issuer',
    width: 60,
    Cell: ({ value }: any) => <div className={'font-mono'}>{value.truncate()}</div>,
    accessor: 'issuer',
  },
  {
    Header: 'Subject',
    width: 160,
    Cell: ({ value }: any) => <div className={'font-mono'}>{value}</div>,
    accessor: (credential) => credential.subject.assertion['@type'],
  },
  {
    Header: 'Issued',
    width: 100,
    Cell: ({ value }: any) => <div className={'font-mono'}>{format(value, 'MM/dd HH:mm:ss O')}</div>,
    accessor: 'issuanceDate',
  },
];

const CredentialsPanel = () => {
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
      <MasterDetailTable columns={columns} data={credentials} />;{/* <JsonView data={credentials} /> */}
    </PanelContainer>
  );
};

export default CredentialsPanel;
