//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { createKeyColumn, GridColumn } from '@dxos/aurora-grid';
import { PublicKey } from '@dxos/keys';
import { KeyRecord } from '@dxos/protocols/proto/dxos/halo/keyring';
import { useDevtools, useStream } from '@dxos/react-client/devtools';

import { MasterDetailTable } from '../../../components';

const columns: GridColumn<KeyRecord>[] = [
  createKeyColumn('publicKey', {
    accessor: (record) => PublicKey.from(record.publicKey),
    key: true,
    header: { label: 'public key' },
  }),
  createKeyColumn('privateKey', {
    accessor: (record) => record.privateKey && PublicKey.from(record.privateKey),
    header: { label: 'private key' },
  }),
];

export const KeyringPanel = () => {
  const devtoolsHost = useDevtools();
  const { keys } = useStream(() => devtoolsHost.subscribeToKeyringKeys({}), {});
  if (keys === undefined) {
    return null;
  }

  return <MasterDetailTable columns={columns} data={keys} />;
};
