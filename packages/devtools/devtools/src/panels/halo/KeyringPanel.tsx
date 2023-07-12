//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { PublicKey } from '@dxos/keys';
import { TableColumn } from '@dxos/mosaic';
import { KeyRecord } from '@dxos/protocols/proto/dxos/halo/keyring';
import { useDevtools, useStream } from '@dxos/react-client';
import { humanize } from '@dxos/util';

import { MasterDetailTable } from '../../components';

const columns: TableColumn<KeyRecord>[] = [
  {
    Header: 'Pub Key',
    width: 120,
    accessor: (record) => PublicKey.from(record.publicKey).truncate(),
  },
  {
    Header: 'Pub Key Name',
    accessor: (record) => humanize(record.publicKey),
  },
  {
    Header: 'Private Key',
    accessor: (record) => record.privateKey && PublicKey.from(record.privateKey).truncate(),
  },
];

const KeyringPanel = () => {
  const devtoolsHost = useDevtools();
  const { keys } = useStream(() => devtoolsHost.subscribeToKeyringKeys({}), {});
  if (keys === undefined) {
    return null;
  }

  return <MasterDetailTable columns={columns} data={keys} />;
};

export default KeyringPanel;
