//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Format } from '@dxos/echo/Format';
import { PublicKey } from '@dxos/keys';
import { type DevtoolsHost } from '@dxos/protocols/rpc';
import { useDevtools, useStream } from '@dxos/react-client/devtools';
import { Panel } from '@dxos/react-ui';
import { type TablePropertyDefinition } from '@dxos/react-ui-table';

import { MasterDetailTable } from '../../../../components/index.ts';
import { type ArticleProps } from '../../types.ts';

export const KeyringArticle = ({ role }: ArticleProps) => {
  const devtoolsHost = useDevtools();
  const { keys } = useStream(() => devtoolsHost.subscribeToKeyringKeys({}), {});

  const properties: TablePropertyDefinition[] = useMemo(
    () => [{ name: 'publicKey', title: 'Public Key', format: Format.TypeFormat.DID }],
    [],
  );

  const data = useMemo(
    () =>
      keys?.map((record: DevtoolsHost.KeyRecord) => ({
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
    <Panel.Root role={role}>
      <Panel.Content>
        <MasterDetailTable
          properties={properties}
          data={data}
          detailsTransform={(d) => d._original}
          detailsPosition='bottom'
        />
      </Panel.Content>
    </Panel.Root>
  );
};
