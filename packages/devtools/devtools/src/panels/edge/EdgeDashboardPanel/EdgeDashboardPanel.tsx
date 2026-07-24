//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { PublicKey, useClient, useMulticastObservable } from '@dxos/react-client';
import { Panel } from '@dxos/react-ui';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { arrayToString, deepMapValues } from '@dxos/util';

export const EdgeDashboardPanel = () => {
  const client = useClient();

  const credentials = useMulticastObservable(client.halo.credentials);
  const serviceCredentials = credentials.filter(
    (cred) => cred.subject.assertion['@type'] === 'dxos.halo.credentials.ServiceAccess',
  );

  return (
    <Panel.Root>
      <Panel.Content classNames='flex-1 flex-row'>
        <JsonHighlighter data={formatData(serviceCredentials)} />
      </Panel.Content>
    </Panel.Root>
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
