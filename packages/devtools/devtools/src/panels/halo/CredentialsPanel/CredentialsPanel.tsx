//
// Copyright 2020 DXOS.org
//

import React, { useMemo } from 'react';

import { FormatEnum } from '@dxos/echo-schema';
import { type Credential } from '@dxos/protocols/proto/dxos/halo/credentials';
import { Toolbar } from '@dxos/react-ui';
import { type TablePropertyDefinition } from '@dxos/react-ui-table';

import { MasterDetailTable, PanelContainer } from '../../../components';
import { SpaceSelector } from '../../../containers';
import { useDevtoolsState, useCredentials } from '../../../hooks';

export const CredentialsPanel = () => {
  const { space, haloSpaceKey } = useDevtoolsState();
  const credentials = useCredentials({ spaceKey: haloSpaceKey || space?.key });

  const properties: TablePropertyDefinition[] = useMemo(
    () => [
      { name: 'id', format: FormatEnum.DID, tooltip: true, size: 120 },
      { name: 'issuer', format: FormatEnum.DID, tooltip: true, size: 120 },
      { name: 'type', format: FormatEnum.String, size: 380 },
      { name: 'issuanceDate', format: FormatEnum.DateTime, title: 'issued', size: 220 },
    ],
    [],
  );

  const data = useMemo(
    () =>
      credentials.map((credential: Credential) => ({
        id: credential.id?.toString() ?? '',
        issuer: credential.issuer.toString(),
        type: credential.subject.assertion['@type'],
        issuanceDate: credential.issuanceDate,
        _original: credential,
      })),
    [credentials],
  );

  return (
    <PanelContainer
      toolbar={
        <Toolbar.Root>
          <SpaceSelector />
        </Toolbar.Root>
      }
    >
      <MasterDetailTable properties={properties} data={data} detailsTransform={(d) => d._original} />
    </PanelContainer>
  );
};
