//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Format } from '@dxos/echo/internal';
import { PublicKey } from '@dxos/keys';
import { type KeyRecord } from '@dxos/protocols/proto/dxos/halo/keyring';
import { useDevtools, useStream } from '@dxos/react-client/devtools';
import { type TablePropertyDefinition } from '@dxos/react-ui-table';

import { MasterDetailTable } from '../../../components';

export const KeyringPanel = () => {
  const devtoolsHost = useDevtools();
  const { keys } = useStream(() => devtoolsHost.subscribeToKeyringKeys({}), {});

  const properties: TablePropertyDefinition[] = useMemo(
    () => [{ name: 'publicKey', title: 'Public Key', format: Format.TypeFormat.DID }],
    [],
  );

  const data = useMemo(
    () =>
      keys?.map((record: KeyRecord) => ({
        id: PublicKey.from(record.publicKey).toHex(),
        publicKey: PublicKey.from(record.publicKey).toHex(),
        _original: record,
      })) || [],
    [keys],
  );

  if (keys === undefined) {
    return null;
  }

  return (
    <MasterDetailTable
      properties={properties}
      data={data}
      detailsTransform={(d) => d._original}
      detailsPosition='bottom'
    />
  );
};
