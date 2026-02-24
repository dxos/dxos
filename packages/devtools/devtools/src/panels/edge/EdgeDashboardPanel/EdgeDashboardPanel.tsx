//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { PublicKey, useClient, useMulticastObservable } from '@dxos/react-client';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { arrayToString, deepMapValues } from '@dxos/util';

import { PanelContainer } from '../../../components';

export const EdgeDashboardPanel = () => {
  const client = useClient();

  const credentials = useMulticastObservable(client.halo.credentials);
  const serviceCredentials = credentials.filter(
    (cred) => (cred.subject as any)?.assertion?.['@type'] === 'dxos.halo.credentials.ServiceAccess',
  );

  return (
    <PanelContainer classNames='flex-1 flex-row'>
      <SyntaxHighlighter language='json'>{JSON.stringify(formatData(serviceCredentials), null, 2)}</SyntaxHighlighter>
    </PanelContainer>
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
