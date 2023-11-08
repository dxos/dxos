//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { JsonView, PanelContainer } from '../../../components';
import { useMetadata } from '../../../hooks';

export const MetadataPanel = () => {
  const metadata = useMetadata();

  return (
    <PanelContainer>
      <JsonView data={metadata} />
    </PanelContainer>
  );
};
