//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { useConfig } from '@dxos/react-client';
import { Next } from '@dxos/react-ui/next';

import { JsonView } from '../../../../components/index.ts';
import { EdgeSelector, VaultSelector } from '../../../../containers/index.ts';
import { type ArticleProps } from '../../types.ts';

type ConfigArticleProps = ArticleProps & {
  vaultSelector?: boolean;
  edgeSelector?: boolean;
};

export const ConfigArticle = ({ role, vaultSelector = true, edgeSelector = true }: ConfigArticleProps) => {
  const config = useConfig();

  return (
    <Next.Panel.Root role={role}>
      <Next.Panel.Header>
        <Next.Toolbar.Root>
          {vaultSelector && <VaultSelector />}
          {edgeSelector && <EdgeSelector />}
        </Next.Toolbar.Root>
      </Next.Panel.Header>
      <Next.Panel.Body>
        <JsonView data={config.values} />
      </Next.Panel.Body>
    </Next.Panel.Root>
  );
};
