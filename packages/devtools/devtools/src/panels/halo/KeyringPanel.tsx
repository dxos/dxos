//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { mx } from '@dxos/aurora-theme';
import { TableColumn } from '@dxos/mosaic';
import { KeyRecord } from '@dxos/protocols/proto/dxos/halo/keyring';
import { PublicKey } from '@dxos/react-client';
import { useDevtools, useStream } from '@dxos/react-client/devtools';

import { MasterDetailTable } from '../../components';
import { textLink } from '../../styles';

const columns: TableColumn<KeyRecord>[] = [
  {
    Header: 'Public Key',
    width: 120,
    Cell: ({ value }: any) => <div className={mx('font-mono', textLink)}>{value.truncate()}</div>,
    accessor: (record) => PublicKey.from(record.publicKey),
  },
  // TODO(burdon): When would we be able to see the private key?
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
