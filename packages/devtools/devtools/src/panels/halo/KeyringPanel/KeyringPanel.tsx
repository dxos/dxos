//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { createColumnBuilder, GridColumnDef } from '@dxos/aurora-grid';
import { PublicKey } from '@dxos/keys';
import { KeyRecord } from '@dxos/protocols/proto/dxos/halo/keyring';
import { useDevtools, useStream } from '@dxos/react-client/devtools';

import { MasterDetailTable } from '../../../components';

const { helper, builder } = createColumnBuilder<KeyRecord>();
const columns: GridColumnDef<KeyRecord, any>[] = [
  helper.accessor((record) => PublicKey.from(record.publicKey), {
    id: 'public',
    ...builder.createKeyCell({ header: 'public key' }),
  }),
  helper.accessor((record) => record.privateKey && PublicKey.from(record.privateKey), {
    id: 'private',
    ...builder.createKeyCell({ header: 'private key' }),
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
