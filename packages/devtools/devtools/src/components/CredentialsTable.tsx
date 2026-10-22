//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Format } from '@dxos/echo/Format';
import { type Credential } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { type TablePropertyDefinition } from '@dxos/react-ui-table';

import { assertionTypeName } from '../util/index.ts';
import { MasterDetailTable } from './MasterDetailTable.tsx';

const properties: TablePropertyDefinition[] = [
  { name: 'id', format: Format.TypeFormat.DID, size: 120 },
  { name: 'issuer', format: Format.TypeFormat.DID, size: 120 },
  { name: 'type', format: Format.TypeFormat.String, size: 380 },
  { name: 'issuanceDate', format: Format.TypeFormat.DateTime, title: 'issued', size: 194 },
];

export type CredentialsTableProps = {
  credentials: Credential[];
};

/** Credentials by id, issuer, assertion type and issue date; selecting one shows it in full below. */
export const CredentialsTable = ({ credentials }: CredentialsTableProps) => {
  const data = useMemo(
    () =>
      credentials.map((credential) => ({
        id: credential.id?.toString() ?? '',
        issuer: credential.issuer?.toString() ?? '',
        type: assertionTypeName(credential),
        issuanceDate: credential.issuanceDate,
        _original: credential,
      })),
    [credentials],
  );

  return (
    <MasterDetailTable
      properties={properties}
      data={data}
      detailsTransform={(row) => row._original}
      detailsPosition='bottom'
    />
  );
};
