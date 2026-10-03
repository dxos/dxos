//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { useDevices, useIdentity } from '@dxos/react-client/halo';
import { Panel, Toolbar } from '@dxos/react-ui';

import { JsonView } from '../../../../components/index.ts';
import { VaultSelector } from '../../../../containers/index.ts';
import { type ArticleProps } from '../../types.ts';

export const IdentityArticle = ({ role }: ArticleProps) => {
  const identity = useIdentity();
  const devices = useDevices();

  return (
    <Panel.Root role={role}>
      <Panel.Header>
        <Toolbar.Root>
          <VaultSelector />
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body>
        <JsonView data={{ ...identity, devices }} />
      </Panel.Body>
    </Panel.Root>
  );
};
