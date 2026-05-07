//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Card } from '@dxos/react-ui';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';

export const JsonCard = ({ data }: { data: unknown }) => {
  return (
    <Card.Content>
      <span />
      {/* TODO(wittjosiah): Span whole row. */}
      <JsonHighlighter data={data} />
      <span />
    </Card.Content>
  );
};
