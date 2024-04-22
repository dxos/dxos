//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { type Credential } from '@dxos/protocols/proto/dxos/halo/credentials';
import { Toolbar } from '@dxos/react-ui';
import { createColumnBuilder, type TableColumnDef, textPadding } from '@dxos/react-ui-table';

import { MasterDetailTable, PanelContainer } from '../../../components';
import { SpaceSelector } from '../../../containers';
import { useDevtoolsState, useCredentials } from '../../../hooks';

const { helper, builder } = createColumnBuilder<Credential>();
const columns: TableColumnDef<Credential, any>[] = [
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  helper.accessor('id', builder.key({ tooltip: true })),
  helper.accessor('issuer', builder.key({ tooltip: true })),
  helper.accessor((credential) => credential.subject.assertion['@type'], {
    id: 'type',
    meta: { cell: { classNames: textPadding } },
    size: 240,
  }),
  helper.accessor('issuanceDate', builder.date({ header: 'issued' })),
];

export const CredentialsPanel = () => {
  const { space, haloSpaceKey } = useDevtoolsState();
  const credentials = useCredentials({ spaceKey: haloSpaceKey || space?.key });

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
