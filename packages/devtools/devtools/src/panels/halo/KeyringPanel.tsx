//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { Column } from 'react-table';

import { PublicKey } from '@dxos/keys';
import { KeyRecord } from '@dxos/protocols/proto/dxos/halo/keyring';
import { useDevtools, useStream } from '@dxos/react-client';
import { humanize } from '@dxos/util';

import { MasterTable } from '../../components';

const columns: Column<KeyRecord>[] = [
  {
    Header: 'Pub Key',
    width: 120,
    accessor: (record) => PublicKey.from(record.publicKey).truncate(4)
  },
  {
    Header: 'Humanized Pub Key',
    accessor: (record) => humanize(record.publicKey)
  },
  {
    Header: 'Private Key',
    accessor: (record) => record.privateKey && PublicKey.from(record.privateKey).truncate(4)
  }
];

const KeyringPanel = () => {
  const devtoolsHost = useDevtools();
  const { keys } = useStream(() => devtoolsHost.subscribeToKeyringKeys({}), {});
  if (keys === undefined) {
    return null;
  }

  return <MasterTable columns={columns} data={keys} />;
};

export default KeyringPanel;
