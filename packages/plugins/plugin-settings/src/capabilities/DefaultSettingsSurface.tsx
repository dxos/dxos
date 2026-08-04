//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';

import { DefaultSettings } from '#containers';

// Split from `react-surface.ts` so that module holds no JSX: a capability module's default export is
// not a component, which disables react-refresh for it and makes it a full-reload boundary for
// everything it imports. Keeping the surface's component here leaves both modules refreshable.
export const DefaultSettingsSurface = ({ data: { subject } }: { data: AppSurface.SettingsData }) => (
  <DefaultSettings subject={subject} />
);
