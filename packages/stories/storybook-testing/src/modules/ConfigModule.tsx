//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useClient } from '@dxos/react-client';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';

/**
 * Renders the active client's resolved configuration as syntax-highlighted JSON —
 * a story-only diagnostic for seeing which services/config a story booted with.
 */
export const ConfigModule = () => {
  const client = useClient();

  return <JsonHighlighter data={client.config.values} classNames='text-xs' copyButton />;
};
