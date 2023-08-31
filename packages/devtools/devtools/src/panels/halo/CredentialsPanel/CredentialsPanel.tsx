//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { Toolbar } from '@dxos/aurora';
import { createColumnBuilder, GridColumnDef } from '@dxos/aurora-grid';
import { Credential } from '@dxos/protocols/proto/dxos/halo/credentials';

import { MasterDetailTable, PanelContainer } from '../../../components';
import { SpaceSelector } from '../../../containers';
import { useDevtoolsState, useCredentials } from '../../../hooks';

const { helper, builder } = createColumnBuilder<Credential>();
const columns: GridColumnDef<Credential, any>[] = [
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  helper.accessor('id', builder.createKey({ tooltip: true })),
  helper.accessor('issuer', builder.createKey({ tooltip: true })),
  helper.accessor((credential) => credential.subject.assertion['@type'], { id: 'type', size: 240 }),
  helper.accessor('issuanceDate', builder.createDate({ header: 'issued' })),
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
