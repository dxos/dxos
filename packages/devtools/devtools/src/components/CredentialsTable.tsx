//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Format } from '@dxos/echo/Format';
import { toPublicKey } from '@dxos/protocols/buf';
import { type Credential } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { type TablePropertyDefinition } from '@dxos/react-ui-table';

import { assertionTypeName } from '../util/index.ts';
import { MasterDetailTable } from './MasterDetailTable.tsx';

// The type leads, since it is what tells credentials apart and a narrow panel shows only the first columns.
const properties: TablePropertyDefinition[] = [
  { name: 'type', format: Format.TypeFormat.String, size: 180 },
  { name: 'id', format: Format.TypeFormat.DID, size: 120 },
  { name: 'issuer', format: Format.TypeFormat.DID, size: 120 },
  { name: 'issuanceDate', format: Format.TypeFormat.DateTime, title: 'issued', size: 194 },
];

export type CredentialsTableProps = {
  credentials: Credential[];
};

/** Credentials by assertion type, id, issuer and issue date; selecting one shows it in full below. */
export const CredentialsTable = ({ credentials }: CredentialsTableProps) => {
  const data = useMemo(
    () =>
      credentials.map((credential) => ({
        // Buf keys are plain messages, whose `toString` is `[object Object]`.
        id: toPublicKey(credential.id)?.toHex() ?? '',
        issuer: toPublicKey(credential.issuer)?.toHex() ?? '',
        // `dxos.halo.credentials.` is common to every type, so only the name after it is shown.
        type: assertionTypeName(credential).split('.').at(-1) ?? '',
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
