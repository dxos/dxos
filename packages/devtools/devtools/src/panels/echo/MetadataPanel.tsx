//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { JsonView } from '../../components';
import { useMetadata } from '../../hooks';

const MetadataPanel = () => {
  const metadata = useMetadata();

  return <JsonView data={metadata} />;
};

export default MetadataPanel;
