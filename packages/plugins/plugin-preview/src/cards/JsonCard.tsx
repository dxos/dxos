//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Card } from '@dxos/react-ui';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';

export const JsonCard = ({ data }: { data: unknown }) => {
  return (
    <Card.Content>
      <JsonHighlighter data={data} />
    </Card.Content>
  );
};
