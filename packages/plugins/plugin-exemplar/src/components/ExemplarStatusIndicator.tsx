//
// Copyright 2025 DXOS.org
//

// Status bar indicator surface — contributes an item to the application status bar.
// `StatusBar.Item` from `@dxos/plugin-status-bar` provides the layout wrapper.
// Status indicators are rendered by the deck layout when `role: 'status-indicator'`
// matches in the surface registry.

import React from 'react';

import { StatusBar } from '@dxos/plugin-status-bar';
import { IconButton } from '@dxos/react-ui';

export const ExemplarStatusIndicator = () => {
  return (
    <StatusBar.Item>
      <IconButton variant='ghost' icon='ph--book-open--regular' iconOnly label='Exemplar plugin active.' />
    </StatusBar.Item>
  );
};

export default ExemplarStatusIndicator;
