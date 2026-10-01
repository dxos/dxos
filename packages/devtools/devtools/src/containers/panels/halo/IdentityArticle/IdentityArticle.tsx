//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { useDevices, useIdentity } from '@dxos/react-client/halo';
import { Next } from '@dxos/react-ui/next';

import { JsonView } from '../../../../components/index.ts';
import { VaultSelector } from '../../../../containers/index.ts';
import { type ArticleProps } from '../../types.ts';

export const IdentityArticle = ({ role }: ArticleProps) => {
  const identity = useIdentity();
  const devices = useDevices();

  return (
    <Next.Panel.Root role={role}>
      <Next.Panel.Header>
        <Next.Toolbar.Root>
          <VaultSelector />
        </Next.Toolbar.Root>
      </Next.Panel.Header>
      <Next.Panel.Body>
        <JsonView data={{ ...identity, devices }} />
      </Next.Panel.Body>
    </Next.Panel.Root>
  );
};
