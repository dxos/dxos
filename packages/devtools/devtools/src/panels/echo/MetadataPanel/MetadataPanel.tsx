//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Panel } from '@dxos/react-ui';

import { JsonView } from '../../../components';
import { useMetadata } from '../../../hooks';

export const MetadataPanel = () => {
  const metadata = useMetadata();

  return (
    <Panel.Root classNames='bs-full'>
      <Panel.Content classNames='overflow-auto'>
        <JsonView data={metadata} />
      </Panel.Content>
    </Panel.Root>
  );
};
