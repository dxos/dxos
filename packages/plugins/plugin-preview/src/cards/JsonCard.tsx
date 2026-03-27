//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Card } from '@dxos/react-ui';
import { Json } from '@dxos/react-ui-syntax-highlighter';

export const JsonCard = ({ data }: { data: unknown }) => {
  return (
    <Card.Content>
      <Json data={data} />
    </Card.Content>
  );
};
