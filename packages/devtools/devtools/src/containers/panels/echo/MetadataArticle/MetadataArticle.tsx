//
// Copyright 2023 DXOS.org
//

import React from 'react';

import * as Panel from '@dxos/react-ui/Panel';

import { JsonView } from '../../../../components/index.ts';
import { useMetadata } from '../../../../hooks/index.ts';
import { type ArticleProps } from '../../types.ts';

export const MetadataArticle = ({ role }: ArticleProps) => {
  const metadata = useMetadata();

  return (
    <Panel.Root role={role}>
      <Panel.Body>
        <JsonView data={metadata} />
      </Panel.Body>
    </Panel.Root>
  );
};
