//
// Copyright 2020 DXOS.org
//

import React, { useMemo } from 'react';

import { FormatEnum } from '@dxos/echo-schema';
import { type Credential } from '@dxos/protocols/proto/dxos/halo/credentials';
import { type Space } from '@dxos/react-client/echo';
import { Toolbar } from '@dxos/react-ui';
import { type TablePropertyDefinition } from '@dxos/react-ui-table';

import { MasterDetailTable, PanelContainer } from '../../../components';
import { SpaceSelector } from '../../../containers';
import { useDevtoolsState, useCredentials } from '../../../hooks';

export const CredentialsPanel = (props: { space?: Space }) => {
  const state = useDevtoolsState();
  const space = props.space ?? state.space;
  const credentials = useCredentials({ spaceKey: state.haloSpaceKey ?? space?.key });

  const properties: TablePropertyDefinition[] = useMemo(
    () => [
      { name: 'id', format: FormatEnum.DID, tooltip: true, size: 120 },
      { name: 'issuer', format: FormatEnum.DID, tooltip: true, size: 120 },
      { name: 'type', format: FormatEnum.String, size: 380 },
      { name: 'issuanceDate', format: FormatEnum.DateTime, title: 'issued', size: 194 },
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
        !props.space && (
          <Toolbar.Root>
            <SpaceSelector />
          </Toolbar.Root>
        )
      }
    >
      <MasterDetailTable
        properties={properties}
        data={data}
        detailsTransform={(d) => d._original}
        detailsPosition='bottom'
      />
    </PanelContainer>
  );
};
