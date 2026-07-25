//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { LogPanel } from '@dxos/react-ui-debug';
import { type ModuleProps } from '@dxos/story-modules';

/**
 * Renders the `@dxos/react-ui-debug` {@link LogPanel} — a live `@dxos/log` viewer with filter,
 * level, and record controls — as a story module. LogPanel is self-contained (it reads the global
 * log stream and supplies its own toolbar), so the module renders it directly.
 */
export const LoggingModule = (_props: ModuleProps) => {
  return <LogPanel classNames='bs-full' />;
};
