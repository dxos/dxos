//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { JsonView } from '../../components';
import { useMetadata } from '../../hooks';

const MetadataPanel = () => {
  const metadata = useMetadata();

  return <JsonView className='flex flex-1 overflow-auto ml-2 mt-2' data={metadata} />;
};

export default MetadataPanel;
