//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { PublicKey, useClient, useMulticastObservable } from '@dxos/react-client';
import { Next } from '@dxos/react-ui';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { arrayToString, deepMapValues } from '@dxos/util';

import { type ArticleProps } from '../../types.ts';

export const EdgeDashboardArticle = ({ role }: ArticleProps) => {
  const client = useClient();

  const credentials = useMulticastObservable(client.halo.credentials);
  const serviceCredentials = credentials.filter((cred) =>
    cred.subject?.assertion?.typeUrl.endsWith('dxos.halo.credentials.ServiceAccess'),
  );

  return (
    <Next.Panel.Root role={role}>
      <Next.Panel.Body asChild classNames='flex-1 flex-row'>
        <JsonHighlighter data={formatData(serviceCredentials)} />
      </Next.Panel.Body>
    </Next.Panel.Root>
  );
};

const formatData = (data: any) =>
  deepMapValues(data, (value, recurse) => {
    if (value instanceof Uint8Array) {
      return arrayToString(value);
    }
    if (value instanceof PublicKey) {
      return value.truncate();
    }
    return recurse(value);
  });
