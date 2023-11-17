//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { PublicKey } from '@dxos/keys';
import { type KeyRecord } from '@dxos/protocols/proto/dxos/halo/keyring';
import { useDevtools, useStream } from '@dxos/react-client/devtools';
import { createColumnBuilder, type TableColumnDef } from '@dxos/react-ui-table';

import { MasterDetailTable } from '../../../components';

const { helper, builder } = createColumnBuilder<KeyRecord>();
const columns: TableColumnDef<KeyRecord, any>[] = [
  helper.display(builder.selectRow()),
  helper.accessor((record) => PublicKey.from(record.publicKey), {
    id: 'public',
    ...builder.key({ header: 'public key', tooltip: true }),
  }),
  helper.accessor((record) => record.privateKey && PublicKey.from(record.privateKey), {
    id: 'private',
    ...builder.key({ header: 'private key', tooltip: true }),
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
